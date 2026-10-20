import { Body, Controller, Delete, Get, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { TourDto } from './dto/tour.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type CurrentUserData } from '../common/decorators/current-user.decorator';
import { AuthService } from '../auth/auth.service';
import { setSessionCookie } from '../auth/session-cookie.util';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {

  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  findAll(@CurrentUser() currentUser: CurrentUserData) {
    return this.usersService.findAll(currentUser);
  }

  // Antes de ':id' para que "me" no se tome como id. Cambiar la contraseña
  // cierra todas las sesiones y le entrega una nueva a quien la cambió.
  @Patch('me/password')
  async changeOwnPassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() currentUser: CurrentUserData,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.usersService.changeOwnPassword(currentUser.userId, dto.currentPassword, dto.newPassword);
    const { accessToken, expiresAt } = await this.authService.issueSession(currentUser.userId);
    setSessionCookie(res, accessToken, expiresAt);
    return user;
  }

  // La guía del panel y las tarjetas de primera vez de cada sección (ver TourDto).
  @Patch('me/tour')
  setOwnTour(@Body() dto: TourDto, @CurrentUser() currentUser: CurrentUserData) {
    return this.usersService.setOwnTour(currentUser.userId, dto.done, dto.tip);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() currentUser: CurrentUserData) {
    return this.usersService.findOne(id, currentUser);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() currentUser: CurrentUserData) {
    return this.usersService.remove(id, currentUser);
  }
}
