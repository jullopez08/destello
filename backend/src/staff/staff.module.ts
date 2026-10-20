import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { StaffAdminController } from './staff-admin.controller';
import { StaffAdminService } from './staff-admin.service';
import { StaffAuthController } from './staff-auth.controller';
import { StaffAuthService } from './staff-auth.service';
import { StaffSessionGuard } from './staff-session.guard';

// Meseros y pantalla de cocina (Fase 3). Su sesión usa el mismo secreto que la de la dueña, pero con
// `kind: 'staff'` y su propia cookie: JwtStrategy no la acepta (busca un User con ese id y no existe).
@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ secret: config.getOrThrow<string>('JWT_SECRET') }),
    }),
  ],
  controllers: [StaffAdminController, StaffAuthController],
  providers: [StaffAdminService, StaffAuthService, StaffSessionGuard],
  exports: [StaffAuthService, StaffSessionGuard],
})
export class StaffModule {}
