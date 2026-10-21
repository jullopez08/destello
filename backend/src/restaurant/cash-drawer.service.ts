import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { imageMime } from '../uploads/image-signature';
import { CASH_TOLERANCE, cashOutProblem, closeOutcome, expectedCash, type CashOutReason, type CloseOutcome } from './cash-rules';

/** Historial de turnos en Caja: 30 días. */
const HISTORY_DAYS = 30;
/** Foto de una factura: hasta 5 MB (el panel la achica antes de subirla). */
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
const MOVES = { orderBy: { createdAt: 'asc' }, include: { receipt: { select: { id: true } } } } as const;
type MoveRow = { id: string; kind: 'IN' | 'OUT'; amount: number; reason: string; by: string; createdAt: Date; category: string | null; noReceipt: boolean; receipt: { id: string } | null };
const moveView = (m: MoveRow) => ({ id: m.id, kind: m.kind, amount: m.amount, reason: m.reason, by: m.by, at: m.createdAt, category: m.category, noReceipt: m.noReceipt, hasReceipt: !!m.receipt });

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
        moves: shift.moves.map(moveView),
        // Solo la dueña: lo esperado y lo que entró por transferencia y tarjeta (para cuadrar con el banco y el datáfono).
        ...(parts ? { ...parts, expected: expectedCash({ ...parts, openingCash: shift.openingCash, moves: shift.moves }) } : {}),
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

  // Una salida lleva motivo, detalle y la foto de la factura (o "No me dieron factura"), como pidió Julieth.
  async move(organizationId: string, by: string, m: { kind: 'IN' | 'OUT'; amount: number; reason: string; category?: CashOutReason; noReceipt?: boolean }, photo?: Express.Multer.File) {
    const shift = await this.mustBeOpen(organizationId);
    const mime = photo ? imageMime(photo.buffer) : null;
    if (photo && (photo.size > RECEIPT_MAX_BYTES || !mime)) throw new BadRequestException('La factura debe ser una foto (JPG, PNG o WebP) de hasta 5 MB.');
    const out = m.kind === 'OUT';
    const problem = out ? cashOutProblem({ category: m.category, reason: m.reason, hasReceipt: !!photo, noReceipt: !!m.noReceipt }) : null;
    if (problem) throw new BadRequestException(problem);
    await this.prisma.cashMove.create({
      data: {
        organizationId,
        shiftId: shift.id,
        kind: m.kind,
        amount: m.amount,
        reason: m.reason.trim(),
        by,
        category: out ? m.category : null,
        noReceipt: out && !photo && !!m.noReceipt,
        ...(out && photo ? { receipt: { create: { organizationId, data: new Uint8Array(photo.buffer), mime: mime!, size: photo.size } } } : {}),
      },
    });
  }

  // La foto de la factura de una salida (solo la dueña).
  async receipt(organizationId: string, moveId: string) {
    const receipt = await this.prisma.cashReceipt.findUnique({ where: { moveId } });
    if (!receipt || receipt.organizationId !== organizationId) throw new NotFoundException('Esa salida no tiene factura.');
    return receipt;
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
      include: { moves: MOVES },
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
      moves: s.moves.map(moveView),
      /** Hay que revisarlo: no cuadró o salió efectivo sin factura */
      flagged: Math.abs((s.counted ?? 0) - (s.expected ?? 0)) >= CASH_TOLERANCE || s.moves.some((m) => m.noReceipt),
    }));
  }

  private openShift(organizationId: string) {
    return this.prisma.cashShift.findUnique({ where: { openKey: organizationId }, include: { moves: MOVES } });
  }

  private async mustBeOpen(organizationId: string) {
    const shift = await this.openShift(organizationId);
    if (!shift) throw new BadRequestException('Primero abre la caja con la base.');
    return shift;
  }

  // Lo cobrado desde que se abrió el turno. Al cajón solo entra el efectivo de las mesas y de los pedidos que recogieron
  // en el local; la transferencia y la tarjeta van al banco y al datáfono, y se muestran aparte para cuadrarlos allá.
  private async parts(organizationId: string, shift: { openedAt: Date }) {
    const since = { gte: shift.openedAt };
    const [byMethod, orders] = await Promise.all([
      this.prisma.tablePayment.groupBy({ by: ['method'], where: { organizationId, createdAt: since }, _sum: { amount: true } }),
      this.prisma.order.findMany({
        where: { organizationId, status: 'DELIVERED', deliveredAt: since },
        select: { payment: true, delivery: true, lines: { select: { qty: true, unitPrice: true } } },
      }),
    ]);
    const table = (m: 'CASH' | 'TRANSFER' | 'CARD') => byMethod.find((x) => x.method === m)?._sum.amount ?? 0;
    const total = (list: typeof orders) => list.reduce((a, o) => a + o.lines.reduce((b, l) => b + l.qty * l.unitPrice, 0), 0);
    return {
      tables: table('CASH'),
      pickups: total(orders.filter((o) => o.payment === 'CASH' && o.delivery === 'PICKUP')),
      transfer: table('TRANSFER') + total(orders.filter((o) => o.payment === 'TRANSFER')),
      card: table('CARD'),
    };
  }
}
