import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Escribe un correo válido, como nombre@correo.com.' })
  email!: string;
}
