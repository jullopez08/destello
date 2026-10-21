import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { closeOutcome, expectedCash, type CloseOutcome } from './cash-rules';

/** Historial de turnos en Caja: 30 días. */
const HISTORY_DAYS = 30;

// El cajón de la caja (Julieth, 2026-10-21): se abre el turno con la base, se anotan las entradas y salidas de efectivo
// que no son ventas, y se cierra contando a ciegas (`cash-rules.ts`). Lo esperado = base + mesas pagadas en efectivo +
// pedidos en efectivo que recogieron en el local (entregados en el turno) + entradas − salidas. Los de domicilio los
// cobra el repartidor: entran como "entrada de efectivo" cuando los entrega.
@Injectable()
export class CashDrawerService {
  constructor(private readonly prisma: PrismaService) {}

  /** `reveal`: la dueña ve cuánto debería haber; el encargado de caja no (cuenta a ciegas). */
  async state(organizationId: string, reveal: boolean) {
    const shift = await this.openShift(organizationId);
    const history = reveal ? await this.history(organizationId) : [];
    if (!shift) return { shift: null, history };
    const parts = reveal ? await this.parts(organizationId, shift) : null;
    return {
      shift: {
        id: shift.id,
        openedAt: shift.openedAt,
        openedBy: shift.openedBy,
        openingCash: shift.openingCash,
        recount: shift.firstCount !== null,
        moves: shift.moves.map((m) => ({ id: m.id, kind: m.kind, amount: m.amount, reason: m.reason, by: m.by, at: m.createdAt })),
        ...(parts ? { tables: parts.tables, pickups: parts.pickups, expected: expectedCash({ ...parts, openingCash: shift.openingCash, moves: shift.moves }) } : {}),
      },
      history,
    };
  }

  async open(organizationId: string, by: string, openingCash: number) {
    try {
      await this.prisma.cashShift.create({ data: { organizationId, openKey: organizationId, openedBy: by, openingCash } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new BadRequestException('La caja ya está abierta.');
      throw e;
    }
  }

  async move(organizationId: string, by: string, kind: 'IN' | 'OUT', amount: number, reason: string) {
    const shift = await this.mustBeOpen(organizationId);
    await this.prisma.cashMove.create({ data: { organizationId, shiftId: shift.id, kind, amount, reason: reason.trim(), by } });
  }

  async close(organizationId: string, by: string, counted: number, note?: string): Promise<CloseOutcome> {
    const shift = await this.mustBeOpen(organizationId);
    const expected = expectedCash({ ...(await this.parts(organizationId, shift)), openingCash: shift.openingCash, moves: shift.moves });
    const outcome = closeOutcome(counted, expected, shift.firstCount, note);
    if (outcome.kind === 'recount') {
      await this.prisma.cashShift.update({ where: { id: shift.id }, data: { firstCount: counted } });
    } else if (outcome.kind === 'close') {
      // Solo uno lo cierra aunque toquen al tiempo (la dueña y el encargado).
      const { count } = await this.prisma.cashShift.updateMany({
        where: { id: shift.id, openKey: organizationId },
        data: { openKey: null, closedAt: new Date(), closedBy: by, counted, expected, note: note?.trim() || null },
      });
      if (!count) throw new BadRequestException('La caja ya se cerró.');
    }
    return outcome;
  }

  async review(organizationId: string, shiftId: string) {
    const { count } = await this.prisma.cashShift.updateMany({ where: { id: shiftId, organizationId, closedAt: { not: null } }, data: { reviewedAt: new Date() } });
    if (!count) throw new NotFoundException('Turno no encontrado.');
  }

  // Turnos cerrados de 30 días, para Caja y el Excel de cierre de caja.
  async history(organizationId: string, since = new Date(Date.now() - HISTORY_DAYS * 86_400_000), until?: Date) {
    const shifts = await this.prisma.cashShift.findMany({
      where: { organizationId, closedAt: { not: null }, openedAt: { gte: since, ...(until ? { lt: until } : {}) } },
      orderBy: { openedAt: 'desc' },
      include: { moves: { orderBy: { createdAt: 'asc' } } },
    });
    return shifts.map((s) => ({
      id: s.id,
      openedAt: s.openedAt,
      openedBy: s.openedBy,
      openingCash: s.openingCash,
      closedAt: s.closedAt!,
      closedBy: s.closedBy ?? '',
      expected: s.expected ?? 0,
      counted: s.counted ?? 0,
      difference: (s.counted ?? 0) - (s.expected ?? 0),
      firstCount: s.firstCount,
      note: s.note,
      reviewedAt: s.reviewedAt,
      moves: s.moves.map((m) => ({ kind: m.kind, amount: m.amount, reason: m.reason, by: m.by, at: m.createdAt })),
    }));
  }

  private openShift(organizationId: string) {
    return this.prisma.cashShift.findUnique({ where: { openKey: organizationId }, include: { moves: { orderBy: { createdAt: 'asc' } } } });
  }

  private async mustBeOpen(organizationId: string) {
    const shift = await this.openShift(organizationId);
    if (!shift) throw new BadRequestException('Primero abre la caja con la base.');
    return shift;
  }

  // Efectivo cobrado desde que se abrió el turno: mesas y pedidos que recogieron en el local.
  private async parts(organizationId: string, shift: { openedAt: Date }) {
    const [tables, pickups] = await Promise.all([
      this.prisma.tablePayment.aggregate({ where: { organizationId, method: 'CASH', createdAt: { gte: shift.openedAt } }, _sum: { amount: true } }),
      this.prisma.order.findMany({
        where: { organizationId, payment: 'CASH', delivery: 'PICKUP', status: 'DELIVERED', deliveredAt: { gte: shift.openedAt } },
        select: { lines: { select: { qty: true, unitPrice: true } } },
      }),
    ]);
    return {
      tables: tables._sum.amount ?? 0,
      pickups: pickups.reduce((a, o) => a + o.lines.reduce((b, l) => b + l.qty * l.unitPrice, 0), 0),
    };
  }
}
