import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { KitchenController } from './kitchen.controller';
import { KitchenSnapshotService } from './kitchen-snapshot.service';
import { KitchenSettingsService } from './kitchen-settings.service';
import { InventoryService } from './inventory.service';
import { RecipeBookService } from './recipe-book.service';
import { PresentationsService } from './presentations.service';
import { OrdersService } from './orders.service';

@Module({
  imports: [PrismaModule],
  controllers: [KitchenController],
  providers: [KitchenSnapshotService, KitchenSettingsService, InventoryService, RecipeBookService, PresentationsService, OrdersService],
  exports: [KitchenSnapshotService],
})
export class KitchenModule {}
