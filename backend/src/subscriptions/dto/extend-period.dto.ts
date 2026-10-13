import { IsInt } from 'class-validator';

export class ExtendPeriodDto {

  @IsInt()
  days!: number;
}
