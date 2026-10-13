import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import type { WompiWebhookPayload } from '../wompi/wompi.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type CurrentUserData,
} from '../common/decorators/current-user.decorator';

// Deliberately without RequireActiveOrganizationGuard anywhere: a organization locked
// for non-payment has to be able to reach these to pay its way back in.
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Takes no body on purpose — the plan is the one the Super Admin assigned,
  // and amount, reference and email are all derived server-side from the
  // caller's session (see PaymentsService.createCheckout). With no @Body()
  // parameter, anything a client sends in the body is simply ignored.
  @Post('signature')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(200)
  createCheckout(@CurrentUser() currentUser: CurrentUserData) {
    return this.paymentsService.createCheckout(currentUser);
  }

  // Public — no guards. Signature validated inside PaymentsService against
  // WOMPI_EVENTS_SECRET before anything else happens. `payload` is typed as
  // a plain interface (not a class), so the global ValidationPipe's
  // whitelist/forbidNonWhitelisted rules don't apply to it — Wompi's event
  // shape isn't ours to constrain. Always 200 (Nest defaults POST to 201):
  // anything else makes Wompi retry (30min/3h/24h).
  @Post('webhook/wompi')
  @HttpCode(200)
  handleWompiWebhook(@Body() payload: WompiWebhookPayload) {
    return this.paymentsService.handleWompiWebhook(payload);
  }

  // Public too: /pago/confirmacion may be opened in a browser without a
  // session, and the response only echoes what Wompi's own public API
  // already returns for this id. Rate-limited per IP because every call
  // costs an outbound request to Wompi.
  @Get('transactions/:id')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 5 * 60 * 1000 } })
  getTransactionStatus(@Param('id') id: string) {
    return this.paymentsService.getTransactionStatus(id);
  }
}
