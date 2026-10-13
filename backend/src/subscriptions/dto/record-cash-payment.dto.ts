import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class RecordCashPaymentDto {

  /// COP cents, same convention as Plan.price and every other Payment.amount —
  /// e.g. a $89.000 COP cash payment must be sent as 8900000, not 89000.
  @IsInt()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
