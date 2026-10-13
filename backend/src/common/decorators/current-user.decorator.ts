import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Role } from "@prisma/client";

// Shape returned by JwtStrategy.validate() (src/auth/strategies/jwt.strategy.ts),
// which becomes request.user once JwtAuthGuard has run.
export interface CurrentUserData {
    userId: string;
    email: string;
    roles: Role[];
    organizationId: string | null;
    // Seconds since epoch (standard JWT claim) — see JwtStrategy.validate.
    exp: number;
}

export const CurrentUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): CurrentUserData => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    }
)
