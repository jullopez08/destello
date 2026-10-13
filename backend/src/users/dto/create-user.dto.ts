import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

// SUPER_ADMIN crea otra cuenta de super admin (sin empresa) o una dueña
// (ADMIN) para una empresa existente.
export class CreateUserDto {

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  name!: string;

  @IsIn([Role.SUPER_ADMIN, Role.ADMIN])
  role!: Role;

  @IsOptional()
  @IsString()
  organizationId?: string;
}
