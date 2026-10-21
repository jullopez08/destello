import { Body, Controller, Get, HttpCode, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from '../auth/auth.service';
import { setSessionCookie } from '../auth/session-cookie.util';
import { StartSignupDto, VerifySignupDto } from './dto/signup.dto';
import { SignupService } from './signup.service';
import { CaptchaService } from './captcha.service';
import { MENU_MAX_BYTES } from './signup-rules';

// Rutas públicas de la inscripción, con límite de intentos por IP.
@Controller('signup')
export class SignupController {
  constructor(
    private readonly signup: SignupService,
    private readonly auth: AuthService,
    private readonly captcha: CaptchaService,
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
  // Va con la carta del negocio en PDF (campo `menu`), así que llega como multipart.
  @UseInterceptors(FileInterceptor('menu', { storage: memoryStorage(), limits: { fileSize: MENU_MAX_BYTES, files: 1 } }))
  async start(@Body() dto: StartSignupDto, @UploadedFile() menu: Express.Multer.File | undefined, @Req() req: Request) {
    await this.captcha.check(dto.captcha, req.ip);
    return this.signup.start(dto, menu);
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
