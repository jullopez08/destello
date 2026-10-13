import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { ChangePlanDto } from './dto/change-plan.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ExtendPeriodDto } from './dto/extend-period.dto';
import { SetBillingContactDto } from './dto/set-billing-contact.dto';
import { SetDiscountDto } from './dto/set-discount.dto';
import { RecordCashPaymentDto } from './dto/record-cash-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser, type CurrentUserData } from '../common/decorators/current-user.decorator';

// Todo es del SUPER_ADMIN, salvo GET /me, que es de la dueña (ver
// SubscriptionsService.findMine).
@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class SubscriptionsController {

  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  findAll() {
    return this.subscriptionsService.findAll();
  }

  // Must come before ':organizationId' — otherwise Nest would match "me" as a
  // organizationId param and this route would never be reached.
  @Get('me')
  @Roles(Role.ADMIN)
  findMine(@CurrentUser() currentUser: CurrentUserData) {
    return this.subscriptionsService.findMine(currentUser);
  }

  // Looked up by organizationId, not the Subscription's own id — see
  // SubscriptionsService.findOne for why.
  @Get(':organizationId')
  findOne(@Param('organizationId') organizationId: string) {
    return this.subscriptionsService.findOne(organizationId);
  }

  @Patch(':organizationId/plan')
  changePlan(@Param('organizationId') organizationId: string, @Body() dto: ChangePlanDto) {
    return this.subscriptionsService.changePlan(organizationId, dto.planId);
  }

  @Patch(':organizationId/status')
  updateStatus(@Param('organizationId') organizationId: string, @Body() dto: UpdateStatusDto) {
    return this.subscriptionsService.updateStatus(organizationId, dto.status);
  }

  @Patch(':organizationId/extend')
  extendPeriod(@Param('organizationId') organizationId: string, @Body() dto: ExtendPeriodDto) {
    return this.subscriptionsService.extendPeriod(organizationId, dto.days);
  }

  @Patch(':organizationId/billing-contact')
  setBillingContact(@Param('organizationId') organizationId: string, @Body() dto: SetBillingContactDto) {
    return this.subscriptionsService.setBillingContact(organizationId, dto.userId);
  }

  @Patch(':organizationId/discount')
  setDiscount(@Param('organizationId') organizationId: string, @Body() dto: SetDiscountDto) {
    return this.subscriptionsService.setDiscount(organizationId, dto.discountPercent, dto.discountExpiresAt);
  }

  // Off-system payment collected in person — see SubscriptionsService.recordCashPayment.
  @Post(':organizationId/cash-payment')
  recordCashPayment(@Param('organizationId') organizationId: string, @Body() dto: RecordCashPaymentDto) {
    return this.subscriptionsService.recordCashPayment(organizationId, dto.amount, dto.note);
  }
}
