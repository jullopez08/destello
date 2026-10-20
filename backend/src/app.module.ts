import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PlansModule } from './plans/plans.module';
import { PaymentsModule } from './payments/payments.module';
import { UploadsModule } from './uploads/uploads.module';
import { DataRetentionModule } from './data-retention/data-retention.module';
import { KitchenModule } from './kitchen/kitchen.module';
import { SignupModule } from './signup/signup.module';
import { StaffModule } from './staff/staff.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 5 * 60 * 1000, limit: 8 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    SubscriptionsModule,
    PlansModule,
    PaymentsModule,
    UploadsModule,
    DataRetentionModule,
    KitchenModule,
    SignupModule,
    StaffModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
