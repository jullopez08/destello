import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequireActiveOrganizationGuard } from '../common/guards/require-active-clinic.guard';
import { CurrentUser, type CurrentUserData } from '../common/decorators/current-user.decorator';
import { KitchenSnapshotService, requireOrganization } from './kitchen-snapshot.service';
import { KitchenSettingsService } from './kitchen-settings.service';
import { InventoryService } from './inventory.service';
import { RecipeBookService } from './recipe-book.service';
import { PresentationsService } from './presentations.service';
import { OrdersService } from './orders.service';
import {
  CreateBankAccountDto,
  CreateCourierDto,
  CreateEditionDto,
  CreateLotDto,
  CreateOrderDto,
  CreatePurchaseDto,
  SupplyPerishableDto,
  MoveCourierDto,
  PresentationDto,
  ProductDto,
  ProductionCheckDto,
  RecipeDto,
  SendOrderDto,
  SupplierDto,
  SupplyDto,
  UpdateKitchenSettingsDto,
} from './dto/kitchen.dto';
import { Matches } from 'class-validator';

class DateParam {
  @Matches(/^\d{4}-\d{2}-\d{2}$/) date!: string;
}

// Panel de la cocina: solo la dueña de la empresa, y solo con la empresa
// activa (bloqueada por falta de pago, solo ve Suscripción). Cada cambio
// responde con el estado completo (KitchenSnapshotService).
@Controller('kitchen')
@UseGuards(JwtAuthGuard, RolesGuard, RequireActiveOrganizationGuard)
@Roles(Role.ADMIN)
export class KitchenController {

  constructor(
    private readonly snapshot: KitchenSnapshotService,
    private readonly settings: KitchenSettingsService,
    private readonly inventory: InventoryService,
    private readonly recipeBook: RecipeBookService,
    private readonly presentations: PresentationsService,
    private readonly orders: OrdersService,
  ) {}

  @Get()
  load(@CurrentUser() user: CurrentUserData) {
    return this.snapshot.load(requireOrganization(user));
  }

  // ── Configuración ──

  @Patch('settings')
  updateSettings(@CurrentUser() user: CurrentUserData, @Body() dto: UpdateKitchenSettingsDto) {
    return this.settings.updateSettings(requireOrganization(user), dto);
  }

  @Post('setup/complete')
  @HttpCode(200)
  completeSetup(@CurrentUser() user: CurrentUserData) {
    return this.settings.completeSetup(requireOrganization(user));
  }

  @Post('accounts')
  addAccount(@CurrentUser() user: CurrentUserData, @Body() dto: CreateBankAccountDto) {
    return this.settings.addAccount(requireOrganization(user), dto);
  }

  @Delete('accounts/:id')
  removeAccount(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.settings.removeAccount(requireOrganization(user), id);
  }

  @Post('couriers')
  addCourier(@CurrentUser() user: CurrentUserData, @Body() dto: CreateCourierDto) {
    return this.settings.addCourier(requireOrganization(user), dto);
  }

  @Post('couriers/:id/move')
  @HttpCode(200)
  moveCourier(@CurrentUser() user: CurrentUserData, @Param('id') id: string, @Body() dto: MoveCourierDto) {
    return this.settings.moveCourier(requireOrganization(user), id, dto.direction);
  }

  @Delete('couriers/:id')
  removeCourier(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.settings.removeCourier(requireOrganization(user), id);
  }

  // ── Proveedores, insumos y compras ──

  @Post('suppliers')
  createSupplier(@CurrentUser() user: CurrentUserData, @Body() dto: SupplierDto) {
    return this.inventory.createSupplier(requireOrganization(user), dto);
  }

  @Put('suppliers/:id')
  updateSupplier(@CurrentUser() user: CurrentUserData, @Param('id') id: string, @Body() dto: SupplierDto) {
    return this.inventory.updateSupplier(requireOrganization(user), id, dto);
  }

  @Delete('suppliers/:id')
  removeSupplier(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.inventory.removeSupplier(requireOrganization(user), id);
  }

  @Post('supplies')
  createSupply(@CurrentUser() user: CurrentUserData, @Body() dto: SupplyDto) {
    return this.inventory.createSupply(requireOrganization(user), dto);
  }

  @Patch('supplies/perishable')
  setPerishable(@CurrentUser() user: CurrentUserData, @Body() dto: SupplyPerishableDto) {
    return this.inventory.setPerishable(requireOrganization(user), dto);
  }

  @Put('supplies/:id')
  updateSupply(@CurrentUser() user: CurrentUserData, @Param('id') id: string, @Body() dto: SupplyDto) {
    return this.inventory.updateSupply(requireOrganization(user), id, dto);
  }

  @Delete('supplies/:id')
  removeSupply(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.inventory.removeSupply(requireOrganization(user), id);
  }

  @Post('supply-batches/:id/discard')
  @HttpCode(200)
  discardBatch(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.inventory.discardBatch(requireOrganization(user), id);
  }

  @Post('purchases')
  createPurchase(@CurrentUser() user: CurrentUserData, @Body() dto: CreatePurchaseDto) {
    return this.inventory.createPurchase(requireOrganization(user), dto);
  }

  // ── Recetas, lotes, productos y cajas ──

  @Post('recipes')
  createRecipe(@CurrentUser() user: CurrentUserData, @Body() dto: RecipeDto) {
    return this.recipeBook.createRecipe(requireOrganization(user), dto);
  }

  @Put('recipes/:id')
  updateRecipe(@CurrentUser() user: CurrentUserData, @Param('id') id: string, @Body() dto: RecipeDto) {
    return this.recipeBook.updateRecipe(requireOrganization(user), id, dto);
  }

  @Post('lots')
  createLot(@CurrentUser() user: CurrentUserData, @Body() dto: CreateLotDto) {
    return this.recipeBook.createLot(requireOrganization(user), dto);
  }

  @Post('lots/:id/discard')
  @HttpCode(200)
  discardLot(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.recipeBook.discardLot(requireOrganization(user), id);
  }

  @Post('products')
  createProduct(@CurrentUser() user: CurrentUserData, @Body() dto: ProductDto) {
    return this.recipeBook.createProduct(requireOrganization(user), dto);
  }

  @Put('products/:id')
  updateProduct(@CurrentUser() user: CurrentUserData, @Param('id') id: string, @Body() dto: ProductDto) {
    return this.recipeBook.updateProduct(requireOrganization(user), id, dto);
  }

  @Post('presentations')
  createPresentation(@CurrentUser() user: CurrentUserData, @Body() dto: PresentationDto) {
    return this.presentations.create(requireOrganization(user), dto);
  }

  @Put('presentations/:id')
  updatePresentation(@CurrentUser() user: CurrentUserData, @Param('id') id: string, @Body() dto: PresentationDto) {
    return this.presentations.update(requireOrganization(user), id, dto);
  }

  // ── Pedidos y producción ──

  @Post('orders')
  createOrder(@CurrentUser() user: CurrentUserData, @Body() dto: CreateOrderDto) {
    return this.orders.createOrder(requireOrganization(user), dto);
  }

  @Put('orders/:id')
  updateOrder(@CurrentUser() user: CurrentUserData, @Param('id') id: string, @Body() dto: CreateOrderDto) {
    return this.orders.updateOrder(requireOrganization(user), id, dto);
  }

  @Post('orders/:id/send')
  @HttpCode(200)
  sendOrder(@CurrentUser() user: CurrentUserData, @Param('id') id: string, @Body() dto: SendOrderDto) {
    return this.orders.sendOrder(requireOrganization(user), id, dto.courierId);
  }

  @Post('orders/:id/deliver')
  @HttpCode(200)
  deliverOrder(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.orders.deliverOrder(requireOrganization(user), id);
  }

  @Post('orders/:id/delivered-late')
  @HttpCode(200)
  deliveredLate(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.orders.deliveredLate(requireOrganization(user), id);
  }

  @Post('orders/:id/paid')
  @HttpCode(200)
  markPaid(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.orders.markPaid(requireOrganization(user), id);
  }

  @Post('orders/:id/cancel')
  @HttpCode(200)
  cancelOrder(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.orders.cancelOrder(requireOrganization(user), id);
  }

  @Post('production/:date/register')
  @HttpCode(200)
  registerProduction(@CurrentUser() user: CurrentUserData, @Param() params: DateParam) {
    return this.orders.registerProduction(requireOrganization(user), params.date);
  }

  @Put('production/:date/checks')
  setProductionCheck(@CurrentUser() user: CurrentUserData, @Param() params: DateParam, @Body() dto: ProductionCheckDto) {
    return this.settings.setProductionCheck(requireOrganization(user), params.date, dto.key, dto.done);
  }

  // ── Ediciones especiales ──

  @Post('editions')
  createEdition(@CurrentUser() user: CurrentUserData, @Body() dto: CreateEditionDto) {
    return this.orders.createEdition(requireOrganization(user), dto);
  }

  @Delete('editions/:id')
  removeEdition(@CurrentUser() user: CurrentUserData, @Param('id') id: string, @Query('hide') hide?: string) {
    return this.orders.removeEdition(requireOrganization(user), id, hide === '1');
  }
}
