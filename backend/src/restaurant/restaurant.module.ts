import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StaffModule } from '../staff/staff.module';
import { KitchenModule } from '../kitchen/kitchen.module';
import { KitchenScreenService } from './kitchen-screen.service';
import { FloorService } from './floor.service';
import { CashierController, FloorController, KitchenScreenController, TablesAdminController } from './restaurant.controllers';
import { TablesAdminService } from './tables-admin.service';
import { TableBillService } from './table-bill.service';

// Restaurante (Fase 3): mesas, mesas abiertas, comandas y la cuenta.
@Module({
  imports: [PrismaModule, StaffModule, KitchenModule],
  controllers: [TablesAdminController, FloorController, KitchenScreenController, CashierController],
  providers: [TablesAdminService, FloorService, KitchenScreenService, TableBillService],
})
export class RestaurantModule {}
