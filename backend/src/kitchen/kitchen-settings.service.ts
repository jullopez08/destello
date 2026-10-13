import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KitchenSnapshotService } from './kitchen-snapshot.service';
import { CreateBankAccountDto, CreateCourierDto, UpdateKitchenSettingsDto } from './dto/kitchen.dto';

@Injectable()
export class KitchenSettingsService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshot: KitchenSnapshotService,
  ) {}

  async updateSettings(organizationId: string, dto: UpdateKitchenSettingsDto) {
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

  async addAccount(organizationId: string, dto: CreateBankAccountDto) {
    await this.prisma.bankAccount.create({ data: { organizationId, ...dto } });
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
