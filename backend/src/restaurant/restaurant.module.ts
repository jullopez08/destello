import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StaffModule } from '../staff/staff.module';
import { KitchenModule } from '../kitchen/kitchen.module';
import { KitchenScreenService } from './kitchen-screen.service';
import { FloorService } from './floor.service';
import { CashierController, FloorController, KitchenScreenController, TablesAdminController } from './restaurant.controllers';
import { TablesAdminService } from './tables-admin.service';
import { TableBillService } from './table-bill.service';
import { StuckTicketsService } from './stuck-tickets.service';
import { CashDrawerService } from './cash-drawer.service';
import { OwnerDrawerController, StaffDrawerController } from './cash-drawer.controllers';

// Restaurante (Fase 3): mesas, mesas abiertas, comandas y la cuenta.
@Module({
  imports: [PrismaModule, StaffModule, KitchenModule],
  controllers: [TablesAdminController, FloorController, KitchenScreenController, CashierController, OwnerDrawerController, StaffDrawerController],
  providers: [TablesAdminService, FloorService, KitchenScreenService, TableBillService, StuckTicketsService, CashDrawerService],
})
export class RestaurantModule {}
