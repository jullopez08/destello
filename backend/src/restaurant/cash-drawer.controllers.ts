import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequireActiveOrganizationGuard } from '../common/guards/require-active-clinic.guard';
import { CurrentUser, type CurrentUserData } from '../common/decorators/current-user.decorator';
import { requireOrganization } from '../kitchen/kitchen-snapshot.service';
import { PrismaService } from '../prisma/prisma.service';
import { requireCashier, StaffSessionGuard, type StaffRequest } from '../staff/staff-session.guard';
import { CashDrawerService } from './cash-drawer.service';
import { CashMoveDto, CloseDrawerDto, OpenDrawerDto } from './dto/restaurant.dto';
import { FloorService } from './floor.service';

// El cajón desde Caja, en el panel de la dueña: ve cuánto debería haber y revisa las diferencias.
@Controller('kitchen/cashier/drawer')
@UseGuards(JwtAuthGuard, RolesGuard, RequireActiveOrganizationGuard)
@Roles(Role.ADMIN)
export class OwnerDrawerController {
  constructor(
    private readonly drawer: CashDrawerService,
    private readonly floor: FloorService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async load(@CurrentUser() user: CurrentUserData) {
    return this.drawer.state(await this.org(user), true);
  }

  @Post('open')
  @HttpCode(200)
  async open(@CurrentUser() user: CurrentUserData, @Body() dto: OpenDrawerDto) {
    const org = await this.org(user);
    await this.drawer.open(org, await this.name(user), dto.openingCash);
    return this.drawer.state(org, true);
  }

  @Post('moves')
  @HttpCode(200)
  async move(@CurrentUser() user: CurrentUserData, @Body() dto: CashMoveDto) {
    const org = await this.org(user);
    await this.drawer.move(org, await this.name(user), dto.kind, dto.amount, dto.reason);
    return this.drawer.state(org, true);
  }

  @Post('close')
  @HttpCode(200)
  async close(@CurrentUser() user: CurrentUserData, @Body() dto: CloseDrawerDto) {
    const org = await this.org(user);
    const outcome = await this.drawer.close(org, await this.name(user), dto.counted, dto.note);
    return { outcome, ...(await this.drawer.state(org, true)) };
  }

  @Post('shifts/:id/review')
  @HttpCode(200)
  async review(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    const org = await this.org(user);
    await this.drawer.review(org, id);
    return this.drawer.state(org, true);
  }

  private async org(user: CurrentUserData) {
    const org = requireOrganization(user);
    await this.floor.servesTables(org);
    return org;
  }

  private async name(user: CurrentUserData) {
    const u = await this.prisma.user.findUnique({ where: { id: user.userId }, select: { name: true } });
    return u?.name ?? 'La dueña';
  }
}

// El cajón desde el celular del encargado de caja: abre, anota entradas y salidas y cierra contando a ciegas.
@Controller('staff/floor/drawer')
@UseGuards(StaffSessionGuard)
export class StaffDrawerController {
  constructor(
    private readonly drawer: CashDrawerService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  load(@Req() req: StaffRequest) {
    return this.drawer.state(requireCashier(req).organizationId, false);
  }

  @Post('open')
  @HttpCode(200)
  async open(@Req() req: StaffRequest, @Body() dto: OpenDrawerDto) {
    const staff = requireCashier(req);
    await this.drawer.open(staff.organizationId, await this.name(staff.sub), dto.openingCash);
    return this.drawer.state(staff.organizationId, false);
  }

  @Post('moves')
  @HttpCode(200)
  async move(@Req() req: StaffRequest, @Body() dto: CashMoveDto) {
    const staff = requireCashier(req);
    await this.drawer.move(staff.organizationId, await this.name(staff.sub), dto.kind, dto.amount, dto.reason);
    return this.drawer.state(staff.organizationId, false);
  }

  @Post('close')
  @HttpCode(200)
  async close(@Req() req: StaffRequest, @Body() dto: CloseDrawerDto) {
    const staff = requireCashier(req);
    const outcome = await this.drawer.close(staff.organizationId, await this.name(staff.sub), dto.counted, dto.note);
    return { outcome, ...(await this.drawer.state(staff.organizationId, false)) };
  }

  private async name(staffId: string) {
    const s = await this.prisma.staffMember.findUnique({ where: { id: staffId }, select: { name: true } });
    return s?.name ?? 'Encargado de caja';
  }
}
