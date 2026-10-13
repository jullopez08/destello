import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Same 'jwt' strategy as JwtAuthGuard, but never rejects the request: a
// valid token populates request.user as usual, a missing or invalid one just
// leaves it undefined instead of throwing 401. The only current use is
// GET /patients/search, which must stay reachable by the anonymous public
// booking wizard while still recognizing an authenticated receptionist
// session hitting that exact same route (see PatientsService.findByDocument).
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(err: unknown, user: unknown): TUser {
    return (user ?? undefined) as TUser;
  }
}
