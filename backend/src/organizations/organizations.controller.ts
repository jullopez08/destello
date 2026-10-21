import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
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

  // La carta en PDF que subió al inscribirse: el super admin la abre en el visor del navegador (aislado del computador)
  // en vez de descargarla (Julieth, 2026-10-21). `nosniff`: el navegador no la trata como otra cosa.
  @Get(':id/menu')
  @Roles(Role.SUPER_ADMIN)
  async menu(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const menu = await this.organizationsService.menu(id);
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', 'Cross-Origin-Resource-Policy': 'same-origin' });
    return new StreamableFile(menu.data, { type: 'application/pdf', disposition: `inline; filename="carta-${menu.organizationId}.pdf"`, length: menu.size });
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.organizationsService.update(id, dto);
  }

  // Verifica el negocio; inscrita con SIGNUP_MODE=review, desde aquí ya entra a su cocina.
  @Post(':id/approve')
  @HttpCode(200)
  @Roles(Role.SUPER_ADMIN)
  approve(@Param('id') id: string) {
    return this.organizationsService.approve(id);
  }

  // Revisado su Instagram o Maps y la carta, no parece real: queda en pausa con sus datos.
  @Post(':id/reject')
  @HttpCode(200)
  @Roles(Role.SUPER_ADMIN)
  reject(@Param('id') id: string) {
    return this.organizationsService.reject(id);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.organizationsService.remove(id);
  }
}
