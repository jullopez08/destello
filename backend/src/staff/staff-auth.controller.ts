import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ClaimDeviceDto, StaffLoginDto } from './dto/staff.dto';
import { StaffAuthService } from './staff-auth.service';
import { DEVICE_COOKIE, DEVICE_COOKIE_MS, SESSION_COOKIE, SESSION_HOURS } from './staff-rules';

const cookieBase = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };

// Entrada de meseros y pantalla de cocina. El límite por IP es amplio (todo el restaurante sale por el mismo wifi);
// lo que frena adivinar un PIN es el bloqueo por aparato (5 intentos → 15 minutos).
@Controller('staff')
export class StaffAuthController {
  constructor(private readonly auth: StaffAuthService) {}

  @Post('claim')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 15 * 60 * 1000 } })
  async claim(@Body() dto: ClaimDeviceDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { cookie, profile } = await this.auth.claim(dto.token, req.headers['user-agent']);
    res.cookie(DEVICE_COOKIE, cookie, { ...cookieBase, maxAge: DEVICE_COOKIE_MS });
    res.clearCookie(SESSION_COOKIE, cookieBase);
    return profile;
  }

  /** ¿Este aparato está conectado? Lo usa la página para mostrar el PIN o "pide tu enlace". */
  @Get('device')
  async device(@Req() req: Request) {
    const device = await this.auth.device(req.cookies?.[DEVICE_COOKIE]);
    return this.auth.profile(device.staffId);
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 60, ttl: 5 * 60 * 1000 } })
  async login(@Body() dto: StaffLoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { token, profile } = await this.auth.login(req.cookies?.[DEVICE_COOKIE], dto.pin);
    res.cookie(SESSION_COOKIE, token, { ...cookieBase, maxAge: SESSION_HOURS * 60 * 60 * 1000 });
    return profile;
  }

  @Get('me')
  async me(@Req() req: Request) {
    const session = await this.auth.session(req.cookies?.[SESSION_COOKIE]);
    return this.auth.profile(session.sub);
  }

  /** Cierra el turno: el aparato sigue conectado y la próxima vez pide el PIN. */
  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, cookieBase);
    return { ok: true };
  }
}
