import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AcceptTermsDto } from './dto/accept-terms.dto';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { setSessionCookie } from './session-cookie.util';
import { KNOWN_DEVICE_COOKIE, KNOWN_DEVICE_MAX_AGE_MS, LoginAlertService } from './login-alert.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, type CurrentUserData } from '../common/decorators/current-user.decorator';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
    private readonly loginAlertService: LoginAlertService,
  ) {}

  // Lets the frontend restore a session on page load/reload — the
  // access_token cookie is httpOnly and outlives a reload on its own, but
  // client-side React state doesn't, so this is what app/access/page.tsx
  // calls on mount instead of assuming "no state yet" means "logged out."
  // JwtAuthGuard alone (a valid, unexpired signature) is enough to reach
  // this handler; getCurrentUser then re-checks the account is still active.
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() currentUser: CurrentUserData) {
    const user = await this.authService.getCurrentUser(currentUser.userId);
    return { user, expiresAt: currentUser.exp * 1000 };
  }

  // Rate-limited per IP, same ThrottlerGuard used on the public document
  // searches (see PatientsController/AppointmentController) — this endpoint
  // had no throttling at all before, so a wrong password could be retried
  // indefinitely. 6 attempts per 3 minutes is tight enough to bound
  // credential stuffing without punishing someone who mistypes their
  // password once or twice.
  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 6, ttl: 3 * 60 * 1000 } })
  async login(
    @Body() loginDto: LoginDto, @Req() req: Request, @Res({passthrough: true}) res: Response
  ) {
    const { accessToken, user, expiresAt } = await this.authService.login(loginDto);

    // Aviso por correo si esta cuenta entra desde un navegador nuevo (ver
    // LoginAlertService). Sale después de validar la contraseña, así que un
    // intento fallido no genera correos. req.ip ya viene corregido por
    // `trust proxy` (main.ts).
    if (!this.loginAlertService.isKnownDevice(req.cookies?.[KNOWN_DEVICE_COOKIE], user.id)) {
      this.loginAlertService.notifyNewDevice(user, req.ip, req.headers['user-agent']);
      res.cookie(KNOWN_DEVICE_COOKIE, this.loginAlertService.deviceCookieValue(user.id), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: KNOWN_DEVICE_MAX_AGE_MS,
      });
    }

    setSessionCookie(res, accessToken, expiresAt);

    return { user, expiresAt }
  }


  // Guarded now (was public): invalidating a session needs to know whose
  // session it is. See AuthService.invalidateSessions / JwtStrategy.validate
  // for how this makes the old cookie stop working immediately instead of
  // just being cleared client-side.
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() currentUser: CurrentUserData,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.invalidateSessions(currentUser.userId);
    res.clearCookie('access_token');
    return { success: true };
  }

  // First-login consent (see TermsConsentScreen on the frontend). Any
  // authenticated account may call this; the frontend only asks organization
  // admins to, but recording acceptance for other roles is harmless.
  @Post('accept-terms')
  @UseGuards(JwtAuthGuard)
  async acceptTerms(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() dto: AcceptTermsDto,
  ) {
    const user = await this.authService.acceptTerms(
      currentUser.userId,
      dto.terms_version,
    );
    return { user };
  }

  // Rate-limited to prevent email enumeration and abuse: 3 requests per 10 minutes
  // is generous enough for a legitimate user who mistyped their email once or twice
  // but tight enough to stop automated bulk requests.
  // Same generic message whether `email` matches an account or not — never
  // reveal account existence through this endpoint. See
  // PasswordResetService.forgotPassword for the actual branching.
  // Rate-limited: 3 attempts per 10 minutes per IP — tight enough to stop
  // automated email enumeration while still allowing a user who mistyped
  // their address to try again without waiting long.
  @Post('forgot-password')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 10 * 60 * 1000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.passwordResetService.forgotPassword(dto.email);
    return { message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.' };
  }

  // Rate-limited: 5 attempts per 15 minutes per IP — the one-time token
  // already limits abuse, but rate-limiting adds a second layer against
  // token-guessing brute force on short tokens.
  @Post('reset-password')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.passwordResetService.resetPassword(dto.token, dto.newPassword);
    return { success: true };
  }
}

