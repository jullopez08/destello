import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequireActiveOrganizationGuard } from '../common/guards/require-active-clinic.guard';
import { CurrentUser, type CurrentUserData } from '../common/decorators/current-user.decorator';
import { requireOrganization } from '../kitchen/kitchen-snapshot.service';
import { CreateStaffDto, StaffCashierDto } from './dto/staff.dto';
import { StaffAdminService } from './staff-admin.service';

// Tu equipo (Configuración): solo la dueña, con su empresa activa.
@Controller('kitchen/staff')
@UseGuards(JwtAuthGuard, RolesGuard, RequireActiveOrganizationGuard)
@Roles(Role.ADMIN)
export class StaffAdminController {
  constructor(private readonly staff: StaffAdminService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserData) {
    return this.staff.list(requireOrganization(user));
  }

  @Post()
  create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateStaffDto) {
    return this.staff.create(requireOrganization(user), dto);
  }

  @Post(':id/pin')
  @HttpCode(200)
  newPin(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.staff.newPin(requireOrganization(user), id);
  }

  @Post(':id/link')
  @HttpCode(200)
  newLink(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.staff.newLink(requireOrganization(user), id);
  }

  @Patch(':id/cashier')
  setCashier(@CurrentUser() user: CurrentUserData, @Param('id') id: string, @Body() dto: StaffCashierDto) {
    return this.staff.setCashier(requireOrganization(user), id, dto.cashier);
  }

  @Delete(':id/devices/:deviceId')
  removeDevice(@CurrentUser() user: CurrentUserData, @Param('id') id: string, @Param('deviceId') deviceId: string) {
    return this.staff.removeDevice(requireOrganization(user), id, deviceId);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.staff.remove(requireOrganization(user), id);
  }
}
