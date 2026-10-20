import { Body, Controller, Get, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from '../auth/auth.service';
import { setSessionCookie } from '../auth/session-cookie.util';
import { StartSignupDto, VerifySignupDto } from './dto/signup.dto';
import { SignupService } from './signup.service';

// Rutas públicas de la inscripción, con límite de intentos por IP.
@Controller('signup')
export class SignupController {
  constructor(
    private readonly signup: SignupService,
    private readonly auth: AuthService,
  ) {}

  /** La página pregunta antes de mostrar el formulario */
  @Get('mode')
  mode() {
    return { mode: this.signup.mode };
  }

  @Post('start')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  start(@Body() dto: StartSignupDto) {
    return this.signup.start(dto);
  }

  // Código correcto: nace el negocio y queda con la sesión abierta.
  @Post('verify')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 15 * 60 * 1000 } })
  async verify(@Body() dto: VerifySignupDto, @Res({ passthrough: true }) res: Response) {
    const owner = await this.signup.verify(dto);
    const { accessToken, expiresAt } = await this.auth.issueSession(owner.id);
    setSessionCookie(res, accessToken, expiresAt);
    return { user: await this.auth.getCurrentUser(owner.id), expiresAt };
  }
}
