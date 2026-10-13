import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { handleForeignKeyConstraint, handleUniqueConstraint } from '../common/utils/prisma-errors.util';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {

  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreatePlanDto) {
    return handleUniqueConstraint(
      () => this.prisma.plan.create({ data: dto }),
      'Ya existe un plan con ese nombre.',
    );
  }

  // No `active` filter here on purpose — SUPER_ADMIN needs to see and manage
  // discontinued plans too, not just the ones currently sellable.
  findAll() {
    return this.prisma.plan.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });

    if (!plan) {
      throw new NotFoundException('Plan no encontrado.');
    }

    return plan;
  }

  async update(id: string, dto: UpdatePlanDto) {
    await this.findOne(id);

    return handleUniqueConstraint(
      () => this.prisma.plan.update({ where: { id }, data: dto }),
      'Ya existe un plan con ese nombre.',
    );
  }

  async remove(id: string) {
    await this.findOne(id);

    // Bloquear eliminación si alguna clínica activa tiene este plan en estado activo o de prueba.
    const activeSubscriptions = await this.prisma.subscription.count({
      where: {
        planId: id,
        status: { in: ['ACTIVE', 'TRIALING'] },
        organization: { active: true },
      },
    });

    if (activeSubscriptions > 0) {
      throw new BadRequestException(
        'Esta acción no se puede realizar porque el plan está actualmente vigente con alguna empresa.',
      );
    }

    return handleForeignKeyConstraint(
      () => this.prisma.plan.delete({ where: { id } }),
      'Este plan está en uso por suscripciones y no puede ser eliminado.',
    );
  }
}
