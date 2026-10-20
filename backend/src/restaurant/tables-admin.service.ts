import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Las mesas del negocio (Configuración → Mesas). Solo si atiende en mesas.
@Injectable()
export class TablesAdminService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.diningTable.findMany({
      where: { organizationId },
      orderBy: { position: 'asc' },
      select: { id: true, name: true, sessions: { where: { status: 'OPEN' }, select: { id: true } } },
    }).then((tables) => tables.map(({ sessions, ...t }) => ({ ...t, open: sessions.length > 0 })));
  }

  /** Agrega "Mesa N" siguiendo el número más alto que ya haya. */
  async add(organizationId: string, count: number) {
    await this.servesTables(organizationId);
    const tables = await this.prisma.diningTable.findMany({ where: { organizationId }, select: { name: true, position: true } });
    if (tables.length + count > 100) throw new BadRequestException('Máximo 100 mesas.');
    const highest = Math.max(0, ...tables.map((t) => Number(/^Mesa (\d+)$/.exec(t.name)?.[1] ?? 0)));
    const position = Math.max(0, ...tables.map((t) => t.position));
    const names = new Set(tables.map((t) => t.name));
    const data: { organizationId: string; name: string; position: number }[] = [];
    for (let n = highest + 1; data.length < count; n++) {
      if (!names.has(`Mesa ${n}`)) data.push({ organizationId, name: `Mesa ${n}`, position: position + data.length + 1 });
    }
    await this.prisma.diningTable.createMany({ data });
    return this.list(organizationId);
  }

  async rename(organizationId: string, id: string, name: string) {
    await this.own(organizationId, id);
    const clash = await this.prisma.diningTable.findFirst({ where: { organizationId, name: name.trim(), NOT: { id } } });
    if (clash) throw new BadRequestException(`Ya hay una mesa llamada «${name.trim()}».`);
    await this.prisma.diningTable.update({ where: { id }, data: { name: name.trim() } });
    return this.list(organizationId);
  }

  /** Solo una mesa que nunca se ha usado (las usadas guardan su historial de ventas). */
  async remove(organizationId: string, id: string) {
    await this.own(organizationId, id);
    if (await this.prisma.tableSession.count({ where: { tableId: id } })) {
      throw new BadRequestException('Esta mesa ya tiene ventas guardadas: cámbiale el nombre en vez de quitarla.');
    }
    await this.prisma.diningTable.delete({ where: { id } });
    return this.list(organizationId);
  }

  private async own(organizationId: string, id: string) {
    const table = await this.prisma.diningTable.findUnique({ where: { id } });
    if (!table || table.organizationId !== organizationId) throw new NotFoundException('Mesa no encontrada.');
    return table;
  }

  private async servesTables(organizationId: string) {
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { servesTables: true } });
    if (!org.servesTables) throw new BadRequestException('Activa «¿Atiendes clientes en mesas?» en Configuración.');
  }
}
