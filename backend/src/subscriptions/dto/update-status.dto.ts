import { IsEnum } from 'class-validator';
import { SubscriptionStatus } from '@prisma/client';

export class UpdateStatusDto {

  @IsEnum(SubscriptionStatus)
  status!: SubscriptionStatus;
}
