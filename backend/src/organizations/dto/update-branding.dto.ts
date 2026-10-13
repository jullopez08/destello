import { IsIn, IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';
import { PALETTES } from '../palettes';

// La dueña elige su paleta y su logo desde Configuración. logoUrl: null quita el logo.
export class UpdateBrandingDto {

  @IsOptional()
  @IsIn(PALETTES)
  palette?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  logoUrl?: string | null;
}
