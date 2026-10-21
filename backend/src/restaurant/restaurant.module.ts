import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StaffModule } from '../staff/staff.module';
import { KitchenModule } from '../kitchen/kitchen.module';
import { KitchenScreenService } from './kitchen-screen.service';
import { FloorService } from './floor.service';
import { FloorController, KitchenScreenController, TablesAdminController } from './restaurant.controllers';
import { TablesAdminService } from './tables-admin.service';

// Restaurante (Fase 3): mesas, mesas abiertas y comandas.
@Module({
  imports: [PrismaModule, StaffModule, KitchenModule],
  controllers: [TablesAdminController, FloorController, KitchenScreenController],
  providers: [TablesAdminService, FloorService, KitchenScreenService],
})
export class RestaurantModule {}
