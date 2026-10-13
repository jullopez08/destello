import { Matches } from 'class-validator';

// snake_case on purpose: this is the exact body shape POST /auth/accept-terms
// was specified with ({ terms_version: "2026-09-23" }). The version is the
// lastUpdated date shown on /terminos and /privacidad, hence the date format.
export class AcceptTermsDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'terms_version debe tener el formato AAAA-MM-DD',
  })
  terms_version!: string;
}
