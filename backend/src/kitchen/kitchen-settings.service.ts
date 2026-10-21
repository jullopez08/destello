import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KitchenSnapshotService } from './kitchen-snapshot.service';
import { CreateBankAccountDto, CreateCourierDto, UpdateKitchenSettingsDto } from './dto/kitchen.dto';
import { setupMissing } from './kitchen-setup';

// Mismo valor que BREB_TYPE en frontend/components/kitchen/forms/settings-forms.tsx
export const BREB_TYPE = 'Llave Bre-B';

@Injectable()
export class KitchenSettingsService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshot: KitchenSnapshotService,
  ) {}

  async updateSettings(organizationId: string, dto: UpdateKitchenSettingsDto) {
    if (dto.kitchenNormalMin !== undefined && dto.kitchenMaxMin !== undefined && dto.kitchenMaxMin <= dto.kitchenNormalMin) {
      throw new BadRequestException('El tiempo máximo debe ser mayor que el normal.');
    }
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...dto,
        ...(dto.closedDays ? { closedDays: [...new Set(dto.closedDays)].sort() } : {}),
        ...(dto.whatsapp !== undefined ? { whatsapp: dto.whatsapp.trim() || null } : {}),
      },
    });
    return this.snapshot.load(organizationId);
  }

  // Cierra los primeros pasos: solo si de verdad están los cuatro (no basta con que el panel lo diga).
  async completeSetup(organizationId: string) {
    const [organization, recipes, brebKeys, couriers] = await Promise.all([
      this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { whatsapp: true, setupCompletedAt: true } }),
      this.prisma.recipe.count({ where: { organizationId } }),
      this.prisma.bankAccount.count({ where: { organizationId, type: BREB_TYPE } }),
      this.prisma.courier.count({ where: { organizationId } }),
    ]);
    const missing = setupMissing({ whatsapp: organization.whatsapp, recipes, brebKeys, couriers });
    if (missing.length) throw new BadRequestException(`Te falta ${missing.join(', ')}.`);
    if (!organization.setupCompletedAt) {
      await this.prisma.organization.update({ where: { id: organizationId }, data: { setupCompletedAt: new Date() } });
    }
    return this.snapshot.load(organizationId);
  }

  async addAccount(organizationId: string, dto: CreateBankAccountDto) {
    // Una cuenta bancaria necesita el banco; una llave Bre-B no (la llave basta)
    if (dto.type !== BREB_TYPE && !dto.bank.trim()) {
      throw new BadRequestException('Escribe el banco de la cuenta.');
    }
    await this.prisma.bankAccount.create({
      data: { organizationId, ...dto, bank: dto.bank.trim(), number: dto.number.trim() },
    });
    return this.snapshot.load(organizationId);
  }

  async removeAccount(organizationId: string, id: string) {
    const { count } = await this.prisma.bankAccount.deleteMany({ where: { id, organizationId } });
    if (!count) throw new NotFoundException('Cuenta no encontrada.');
    return this.snapshot.load(organizationId);
  }

  // Un repartidor nuevo queda al final de la lista.
  async addCourier(organizationId: string, dto: CreateCourierDto) {
    const last = await this.prisma.courier.findFirst({ where: { organizationId }, orderBy: { position: 'desc' } });
    await this.prisma.courier.create({ data: { organizationId, ...dto, position: (last?.position ?? -1) + 1 } });
    return this.snapshot.load(organizationId);
  }

  async removeCourier(organizationId: string, id: string) {
    const { count } = await this.prisma.courier.deleteMany({ where: { id, organizationId } });
    if (!count) throw new NotFoundException('Repartidor no encontrado.');
    await this.renumberCouriers(organizationId);
    return this.snapshot.load(organizationId);
  }

  // Sube o baja un repartidor en el orden en que se les pregunta.
  async moveCourier(organizationId: string, id: string, direction: 'up' | 'down') {
    const couriers = await this.prisma.courier.findMany({ where: { organizationId }, orderBy: { position: 'asc' } });
    const index = couriers.findIndex((c) => c.id === id);
    if (index < 0) throw new NotFoundException('Repartidor no encontrado.');
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target >= 0 && target < couriers.length) {
      [couriers[index], couriers[target]] = [couriers[target], couriers[index]];
      await this.prisma.$transaction(
        couriers.map((c, position) => this.prisma.courier.update({ where: { id: c.id }, data: { position } })),
      );
    }
    return this.snapshot.load(organizationId);
  }

  async setProductionCheck(organizationId: string, date: string, key: string, done: boolean) {
    await this.prisma.productionCheck.upsert({
      where: { organizationId_date_key: { organizationId, date, key } },
      create: { organizationId, date, key, done },
      update: { done },
    });
    return this.snapshot.load(organizationId);
  }

  private async renumberCouriers(organizationId: string) {
    const couriers = await this.prisma.courier.findMany({ where: { organizationId }, orderBy: { position: 'asc' } });
    await this.prisma.$transaction(
      couriers.map((c, position) => this.prisma.courier.update({ where: { id: c.id }, data: { position } })),
    );
  }
}
