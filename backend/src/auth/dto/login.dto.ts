import { IsEmail, IsString } from 'class-validator';

export class LoginDto {

  @IsEmail({}, { message: 'Escribe un correo válido, como nombre@correo.com.' })
  email!: string;

  @IsString()
  password!: string;

}