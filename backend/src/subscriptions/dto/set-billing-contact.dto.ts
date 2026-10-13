import { IsNotEmpty, IsString } from 'class-validator';

export class SetBillingContactDto {

  @IsString()
  @IsNotEmpty()
  userId!: string;
}
