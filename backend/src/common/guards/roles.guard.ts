import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@prisma/client";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { isSuperAdmin } from "../auth/is-super-admin.util";
import { hasAnyRole } from "../auth/roles.util";

@Injectable()

export class RolesGuard implements CanActivate{
    constructor(private reflector: Reflector){}

    canActivate(context: ExecutionContext): boolean  {
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()]
        );

        if(!requiredRoles || requiredRoles.length === 0 ){
            return true
        }
        const { user } = context.switchToHttp().getRequest()

        // SUPER_ADMIN always passes, regardless of which roles the endpoint declared.
        if(isSuperAdmin(user)){
            return true
        }

        if(!hasAnyRole(user, requiredRoles)){
            throw new ForbiddenException(
                'No tiene permisos para realizar esta acción',
            )
        }
         return true;
    }
}
