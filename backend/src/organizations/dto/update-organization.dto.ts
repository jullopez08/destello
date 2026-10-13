import { IsIn, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { PALETTES } from '../palettes';

// Lo que el super admin puede corregir de una empresa ya creada. El plan se
// cambia en Suscripciones y la dueña en su propia ficha.
export class UpdateOrganizationDto {

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'El identificador solo puede tener letras minúsculas, números y guiones (sin espacios ni acentos).',
  })
  slug?: string;

  @IsOptional()
  @IsIn(PALETTES)
  palette?: string;
}
