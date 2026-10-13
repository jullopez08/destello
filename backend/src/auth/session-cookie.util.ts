import type { Response } from 'express';

// Cookie httpOnly con el JWT de la sesión. maxAge sale del propio `exp` del
// token (AuthService.getTokenExpiryMs) para que la cookie nunca dure más ni
// menos que el JWT que guarda.
export function setSessionCookie(res: Response, accessToken: string, expiresAt: number): void {
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: expiresAt - Date.now(),
  });
}
