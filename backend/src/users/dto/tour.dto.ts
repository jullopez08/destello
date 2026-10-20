import { IsBoolean, IsOptional, Matches } from 'class-validator';

// Guía del panel: `done` la termina (true) o la vuelve a mostrar con todas sus tarjetas (false);
// `tip` marca como vista la tarjeta de primera vez de una sección.
export class TourDto {
  @IsOptional() @IsBoolean() done?: boolean;
  @IsOptional() @Matches(/^[a-z]{2,20}$/) tip?: string;
}
