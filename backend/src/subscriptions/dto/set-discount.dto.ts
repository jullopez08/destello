import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class SetDiscountDto {

  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent!: number;

  // Omitted or explicitly null both mean "no expiration" — @IsOptional skips
  // the @IsDateString check for both of those, letting only an actual date
  // string through for validation.
  @IsOptional()
  @IsDateString()
  discountExpiresAt?: string | null;
}
