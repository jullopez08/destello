import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { PaymentDueNotice } from './payment-due-notice';
import { SubscriptionBillingCron } from './subscription-billing.cron';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionControlsService } from './subscription-controls.service';

@Module({
  imports: [PrismaModule, EmailModule, ConfigModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionBillingCron, PaymentDueNotice, SubscriptionsService, SubscriptionControlsService],
  exports: [SubscriptionBillingCron, SubscriptionsService],
})
export class SubscriptionsModule {}
