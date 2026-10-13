import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { DataRetentionCron } from './data-retention.cron';

@Module({
  imports: [PrismaModule, EmailModule],
  providers: [DataRetentionCron],
})
export class DataRetentionModule {}
