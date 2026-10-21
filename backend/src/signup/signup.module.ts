import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { SignupController } from './signup.controller';
import { SignupService } from './signup.service';
import { CaptchaService } from './captcha.service';

@Module({
  imports: [AuthModule, EmailModule],
  controllers: [SignupController],
  providers: [SignupService, CaptchaService],
})
export class SignupModule {}
