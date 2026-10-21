import { Controller, Get, NotFoundException, Param, Query, Res, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequireActiveOrganizationGuard } from '../common/guards/require-active-clinic.guard';
import { CurrentUser, type CurrentUserData } from '../common/decorators/current-user.decorator';
import { requireOrganization } from '../kitchen/kitchen-snapshot.service';
import { PrismaService } from '../prisma/prisma.service';
import { accountantReport } from './accountant-report';
import { cashReport } from './cash-report';
import { reportRange, type ReportRange } from './report-range';
import { inventoryReport, ordersReport, purchasesReport } from './stock-reports';

type Builder = (prisma: PrismaService, organizationId: string, range: ReportRange) => Promise<Buffer>;

// Los Excel de cada sección, con "Desde / Hasta" (Julieth, 2026-10-21). Solo la dueña, solo su negocio.
const REPORTS: Record<string, { file: string; build: Builder }> = {
  caja: { file: 'cierre-de-caja', build: cashReport },
  contador: { file: 'ventas-para-el-contador', build: accountantReport },
  pedidos: { file: 'pedidos', build: ordersReport },
  inventario: { file: 'inventario', build: inventoryReport },
  compras: { file: 'compras', build: purchasesReport },
};

@Controller('kitchen/reports')
@UseGuards(JwtAuthGuard, RolesGuard, RequireActiveOrganizationGuard)
@Roles(Role.ADMIN)
export class ReportsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':kind')
  async download(@CurrentUser() user: CurrentUserData, @Param('kind') kind: string, @Query('from') from: unknown, @Query('to') to: unknown, @Res() res: Response) {
    const report = Object.hasOwn(REPORTS, kind) ? REPORTS[kind] : null;
    if (!report) throw new NotFoundException('Ese informe no existe.');
    const range = reportRange(from, to);
    const file = await report.build(this.prisma, requireOrganization(user), range);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${report.file}-${range.from}-a-${range.to}.xlsx"`,
      'Cache-Control': 'no-store',
    });
    res.send(file);
  }
}
