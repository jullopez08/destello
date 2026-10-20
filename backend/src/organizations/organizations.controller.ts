import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type CurrentUserData } from '../common/decorators/current-user.decorator';

@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsController {

  constructor(private readonly organizationsService: OrganizationsService) {}

  // La dueña: su logo y su paleta. Declaradas antes de ':id' para que Nest no
  // tome "me" como id. Siguen disponibles con la empresa bloqueada.
  @Get('me/branding')
  @Roles(Role.ADMIN)
  getOwnBranding(@CurrentUser() currentUser: CurrentUserData) {
    return this.organizationsService.getOwnBranding(currentUser);
  }

  @Patch('me/branding')
  @Roles(Role.ADMIN)
  updateOwnBranding(@Body() dto: UpdateBrandingDto, @CurrentUser() currentUser: CurrentUserData) {
    return this.organizationsService.updateOwnBranding(currentUser, dto);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  create(@Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(dto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN)
  findAll() {
    return this.organizationsService.findAll();
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN)
  findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.organizationsService.update(id, dto);
  }

  // Inscrita sola con SIGNUP_MODE=review: desde aquí ya entra a su cocina.
  @Post(':id/approve')
  @HttpCode(200)
  @Roles(Role.SUPER_ADMIN)
  approve(@Param('id') id: string) {
    return this.organizationsService.approve(id);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.organizationsService.remove(id);
  }
}
