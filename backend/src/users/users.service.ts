import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isSuperAdmin } from '../common/auth/is-super-admin.util';
import { handleUniqueConstraint } from '../common/utils/prisma-errors.util';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    let organizationId: string | null = null;

    if (dto.role === Role.ADMIN) {
      if (!dto.organizationId) {
        throw new BadRequestException('Elige la empresa de la dueña.');
      }
      const organization = await this.prisma.organization.findUnique({ where: { id: dto.organizationId } });
      if (!organization) {
        throw new BadRequestException('La empresa especificada no existe.');
      }
      organizationId = organization.id;
    }

    const password = await bcrypt.hash(dto.password, 10);

    return handleUniqueConstraint(async () => {
      const user = await this.prisma.user.create({
        data: { email: dto.email, password, name: dto.name, roles: [dto.role], organizationId },
      });
      return this.sanitize(user);
    }, 'El correo electrónico ya se encuentra registrado.');
  }

  private sanitize(user: User) {
    const { password: _password, passwordResetToken: _token, passwordResetTokenExpiresAt: _expires, ...rest } = user;
    return rest;
  }

  async findAll(currentUser: CurrentUserData) {
    const users = await this.prisma.user.findMany({
      where: isSuperAdmin(currentUser) ? {} : { organizationId: currentUser.organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.sanitize(user));
  }

  // SUPER_ADMIN ve a cualquiera; los demás solo a sí mismos.
  async findOne(id: string, currentUser: CurrentUserData) {
    if (!isSuperAdmin(currentUser) && currentUser.userId !== id) {
      throw new ForbiddenException('No tiene permisos para ver este usuario.');
    }

    return this.getUserOrThrow(id);
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.getUserOrThrow(id);

    const data: Prisma.UserUpdateInput = { ...dto };

    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
      // Una contraseña nueva puesta por el super admin cierra las sesiones abiertas.
      data.sessionsInvalidatedAt = new Date();
    }

    if (dto.active === false) {
      data.sessionsInvalidatedAt = new Date();
    }

    const user = await handleUniqueConstraint(
      () => this.prisma.user.update({ where: { id }, data }),
      'El correo electrónico ya se encuentra registrado.',
    );

    return this.sanitize(user);
  }

  async setOwnTour(userId: string, done?: boolean, tip?: string) {
    const current = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { seenTips: true } });
    const data =
      done === false
        ? { tourCompletedAt: null, seenTips: [] }
        : {
            ...(done ? { tourCompletedAt: new Date() } : {}),
            ...(tip && !current.seenTips.includes(tip) ? { seenTips: [...current.seenTips, tip] } : {}),
          };
    const user = await this.prisma.user.update({ where: { id: userId }, data });
    return { tourCompletedAt: user.tourCompletedAt, seenTips: user.seenTips };
  }

  async changeOwnPassword(userId: string, currentPassword: string, newPassword: string) {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!existing) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, existing.password);

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Cierra todas las sesiones abiertas. UsersController le entrega enseguida
    // una sesión nueva a quien hizo el cambio, así solo salen las demás.
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, sessionsInvalidatedAt: new Date() },
    });

    return this.sanitize(user);
  }

  async remove(id: string, currentUser: CurrentUserData) {
    if (id === currentUser.userId) {
      throw new BadRequestException('No puede eliminar su propia cuenta.');
    }

    await this.getUserOrThrow(id);

    // Si era el contacto de facturación, la suscripción queda sin contacto.
    await this.prisma.subscription.updateMany({ where: { billingContactUserId: id }, data: { billingContactUserId: null } });
    const user = await this.prisma.user.delete({ where: { id } });

    return this.sanitize(user);
  }

  private async getUserOrThrow(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.sanitize(user);
  }
}
