import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequireActiveOrganizationGuard } from '../common/guards/require-active-clinic.guard';
import { CurrentUser, type CurrentUserData } from '../common/decorators/current-user.decorator';
import { requireOrganization } from '../kitchen/kitchen-snapshot.service';
import { requireKitchen, requireWaiter, StaffSessionGuard, type StaffRequest } from '../staff/staff-session.guard';
import { AddTablesDto, CloseTableDto, RenameTableDto, SendTicketDto } from './dto/restaurant.dto';
import { FloorService } from './floor.service';
import { KitchenScreenService } from './kitchen-screen.service';
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
  ) {}

  @Get()
  load(@Req() req: StaffRequest) {
    return this.floor.load(req.staff.organizationId, req.staff.sub);
  }

  @Post('tables/:id/open')
  open(@Req() req: StaffRequest, @Param('id') id: string) {
    const staff = requireWaiter(req);
    return this.floor.open(staff.organizationId, id, staff.sub);
  }

  @Post('sessions/:id/tickets')
  send(@Req() req: StaffRequest, @Param('id') id: string, @Body() dto: SendTicketDto) {
    const staff = requireWaiter(req);
    return this.floor.send(staff.organizationId, id, dto.lines, staff.sub);
  }

  @Post('sessions/:id/bill')
  @HttpCode(200)
  async requestBill(@Req() req: StaffRequest, @Param('id') id: string) {
    const staff = requireWaiter(req);
    await this.bill.request(staff.organizationId, id, staff.sub);
    return this.floor.load(staff.organizationId, staff.sub);
  }

  @Post('sessions/:id/close')
  @HttpCode(200)
  async close(@Req() req: StaffRequest, @Param('id') id: string, @Body() dto: CloseTableDto) {
    const staff = requireWaiter(req);
    await this.bill.close(staff.organizationId, id, dto, staff.sub);
    return this.floor.load(staff.organizationId, staff.sub);
  }

  @Post('tickets/:id/served')
  @HttpCode(200)
  served(@Req() req: StaffRequest, @Param('id') id: string) {
    const staff = requireWaiter(req);
    return this.floor.served(staff.organizationId, id, staff.sub);
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
