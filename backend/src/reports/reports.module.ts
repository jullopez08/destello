import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportsController } from './reports.controller';
import { StockDaysCron } from './stock-days';

// Excel de la cocina (caja, contador, pedidos, inventario y compras) y el inventario que se guarda cada noche.
@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [StockDaysCron],
})
export class ReportsModule {}
