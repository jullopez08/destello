import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { PALETTES } from '../palettes';

// El super admin crea la empresa, su suscripción y la cuenta de la dueña en un
// solo paso: una pastelería nunca existe sin plan ni sin quien la maneje.
export class CreateOrganizationDto {

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'El identificador solo puede tener letras minúsculas, números y guiones (sin espacios ni acentos).',
  })
  slug!: string;

  @IsString()
  @IsNotEmpty()
  planId!: string;

  @IsOptional()
  @IsIn(PALETTES)
  palette?: string;

  @IsString()
  @IsNotEmpty()
  ownerName!: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @MinLength(8)
  ownerPassword!: string;
}
