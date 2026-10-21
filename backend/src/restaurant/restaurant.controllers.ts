import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequireActiveOrganizationGuard } from '../common/guards/require-active-clinic.guard';
import { CurrentUser, type CurrentUserData } from '../common/decorators/current-user.decorator';
import { requireOrganization } from '../kitchen/kitchen-snapshot.service';
import { requireCashier, requireKitchen, requireWaiter, StaffSessionGuard, type StaffRequest } from '../staff/staff-session.guard';
import { AddTablesDto, CloseTableDto, RenameTableDto, SendTicketDto } from './dto/restaurant.dto';
import { FloorService } from './floor.service';
import { KitchenScreenService } from './kitchen-screen.service';
import { StuckTicketsService } from './stuck-tickets.service';
import { TableBillService } from './table-bill.service';
import { TablesAdminService } from './tables-admin.service';

// Mesas del negocio: solo la dueña.
@Controller('kitchen/tables')
@UseGuards(JwtAuthGuard, RolesGuard, RequireActiveOrganizationGuard)
@Roles(Role.ADMIN)
export class TablesAdminController {
  constructor(private readonly tables: TablesAdminService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserData) {
    return this.tables.list(requireOrganization(user));
  }

  @Post()
  add(@CurrentUser() user: CurrentUserData, @Body() dto: AddTablesDto) {
    return this.tables.add(requireOrganization(user), dto.count);
  }

  @Patch(':id')
  rename(@CurrentUser() user: CurrentUserData, @Param('id') id: string, @Body() dto: RenameTableDto) {
    return this.tables.rename(requireOrganization(user), id, dto.name);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.tables.remove(requireOrganization(user), id);
  }
}

// El salón del mesero (sesión del equipo, nunca la de la dueña).
@Controller('staff/floor')
@UseGuards(StaffSessionGuard)
export class FloorController {
  constructor(
    private readonly floor: FloorService,
    private readonly bill: TableBillService,
    private readonly stuck: StuckTicketsService,
  ) {}

  @Get()
  load(@Req() req: StaffRequest) {
    return this.view(req);
  }

  @Post('tables/:id/open')
  async open(@Req() req: StaffRequest, @Param('id') id: string) {
    const staff = requireWaiter(req);
    await this.floor.open(staff.organizationId, id, staff.sub);
    return this.view(req);
  }

  @Post('sessions/:id/tickets')
  async send(@Req() req: StaffRequest, @Param('id') id: string, @Body() dto: SendTicketDto) {
    const staff = requireWaiter(req);
    await this.floor.send(staff.organizationId, id, dto.lines);
    return this.view(req);
  }

  // El encargado de caja pide la cuenta y cobra cualquier mesa; los demás meseros, solo las suyas.
  @Post('sessions/:id/bill')
  @HttpCode(200)
  async requestBill(@Req() req: StaffRequest, @Param('id') id: string) {
    const staff = requireWaiter(req);
    await this.bill.request(staff.organizationId, id, staff.cashier ? undefined : staff.sub);
    return this.view(req);
  }

  @Post('sessions/:id/close')
  @HttpCode(200)
  async close(@Req() req: StaffRequest, @Param('id') id: string, @Body() dto: CloseTableDto) {
    const staff = requireWaiter(req);
    await this.bill.close(staff.organizationId, id, dto, staff.cashier ? undefined : staff.sub);
    return this.view(req);
  }

  // Comanda trabada en cocina: solo el encargado de caja la destraba (ya salió o anularla).
  @Post('tickets/:id/out')
  @HttpCode(200)
  async out(@Req() req: StaffRequest, @Param('id') id: string) {
    const staff = requireCashier(req);
    await this.stuck.out(staff.organizationId, id);
    return this.view(req);
  }

  @Post('tickets/:id/cancel')
  @HttpCode(200)
  async cancel(@Req() req: StaffRequest, @Param('id') id: string) {
    const staff = requireCashier(req);
    await this.stuck.cancel(staff.organizationId, id, staff.sub);
    return this.view(req);
  }

  @Post('tickets/:id/served')
  @HttpCode(200)
  async served(@Req() req: StaffRequest, @Param('id') id: string) {
    const staff = requireWaiter(req);
    await this.floor.served(staff.organizationId, id);
    return this.view(req);
  }

  private view(req: StaffRequest) {
    return this.floor.load(req.staff.organizationId, req.staff.sub, req.staff.role === 'WAITER' && req.staff.cashier);
  }
}

// La caja en el panel de la dueña (Julieth, 2026-10-20: muchas veces el cliente se para y paga en la caja): ve las
// mesas abiertas y cobra cualquiera, con la misma cuenta del mesero.
@Controller('kitchen/cashier')
@UseGuards(JwtAuthGuard, RolesGuard, RequireActiveOrganizationGuard)
@Roles(Role.ADMIN)
export class CashierController {
  constructor(
    private readonly floor: FloorService,
    private readonly bill: TableBillService,
    private readonly stuck: StuckTicketsService,
  ) {}

  @Get()
  async load(@CurrentUser() user: CurrentUserData) {
    const org = requireOrganization(user);
    await this.floor.servesTables(org);
    return this.view(org);
  }

  @Post('sessions/:id/close')
  @HttpCode(200)
  async close(@CurrentUser() user: CurrentUserData, @Param('id') id: string, @Body() dto: CloseTableDto) {
    const org = requireOrganization(user);
    await this.floor.servesTables(org);
    await this.bill.close(org, id, dto);
    return this.view(org);
  }

  // Comanda trabada en cocina: ya salió (descuenta insumos) o anularla (no se cobra).
  @Post('tickets/:id/out')
  @HttpCode(200)
  async out(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    const org = requireOrganization(user);
    await this.floor.servesTables(org);
    await this.stuck.out(org, id);
    return this.view(org);
  }

  @Post('tickets/:id/cancel')
  @HttpCode(200)
  async cancel(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    const org = requireOrganization(user);
    await this.floor.servesTables(org);
    await this.stuck.cancel(org, id);
    return this.view(org);
  }

  // Las mesas y las comandas anuladas hoy (solo la dueña las ve).
  private async view(org: string) {
    const [floor, cancelled] = await Promise.all([this.floor.load(org, undefined, true), this.stuck.cancelledToday(org)]);
    return { ...floor, cancelled };
  }
}

// Pantalla de cocina (tablet del negocio).
@Controller('staff/kitchen')
@UseGuards(StaffSessionGuard)
export class KitchenScreenController {
  constructor(private readonly kitchen: KitchenScreenService) {}

  @Get()
  load(@Req() req: StaffRequest) {
    return this.kitchen.load(requireKitchen(req).organizationId);
  }

  @Post('tickets/:id/ready')
  @HttpCode(200)
  ready(@Req() req: StaffRequest, @Param('id') id: string) {
    return this.kitchen.ready(requireKitchen(req).organizationId, id);
  }
}
