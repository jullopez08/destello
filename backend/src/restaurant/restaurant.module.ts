import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StaffModule } from '../staff/staff.module';
import { FloorService } from './floor.service';
import { FloorController, TablesAdminController } from './restaurant.controllers';
import { TablesAdminService } from './tables-admin.service';

// Restaurante (Fase 3): mesas, mesas abiertas y comandas.
@Module({
  imports: [PrismaModule, StaffModule],
  controllers: [TablesAdminController, FloorController],
  providers: [TablesAdminService, FloorService],
})
export class RestaurantModule {}
