import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportsController } from './reports.controller';

// Excel de la cocina: caja, contador, pedidos, inventario y compras.
@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
})
export class ReportsModule {}
