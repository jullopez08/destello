import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePlanDto {

  @IsString()
  name!: string;

  /// price in COP cents
  @IsInt()
  @Min(0)
  price!: number;

  @IsInt()
  @Min(1)
  durationDays!: number;

  @IsOptional()
  @IsBoolean()
  isTrial?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
