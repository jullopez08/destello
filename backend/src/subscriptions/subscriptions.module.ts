import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionBillingCron } from './subscription-billing.cron';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionControlsService } from './subscription-controls.service';

@Module({
  imports: [PrismaModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionBillingCron, SubscriptionsService, SubscriptionControlsService],
  exports: [SubscriptionBillingCron, SubscriptionsService],
})
export class SubscriptionsModule {}
