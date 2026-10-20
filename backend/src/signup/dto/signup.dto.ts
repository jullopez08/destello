import { BusinessType } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class StartSignupDto {
  @IsString() @IsNotEmpty() @MaxLength(80) ownerName!: string;
  @IsEmail({}, { message: 'Escribe un correo válido, como nombre@correo.com.' }) @MaxLength(120) email!: string;
  @IsString() @Matches(/^[\d\s+()-]{10,20}$/, { message: 'Escribe el WhatsApp del negocio con sus 10 dígitos.' }) whatsapp!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) businessName!: string;
  @IsEnum(BusinessType) businessType!: BusinessType;
  @IsString() @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' }) @MaxLength(72) password!: string;
  /** Versión de los términos que aceptó al marcar la casilla (AAAA-MM-DD) */
  @Matches(/^\d{4}-\d{2}-\d{2}$/) termsVersion!: string;
}

export class VerifySignupDto {
  @IsEmail({}, { message: 'Escribe un correo válido, como nombre@correo.com.' }) email!: string;
  @Matches(/^\d{6}$/, { message: 'El código tiene 6 números.' }) code!: string;
}
