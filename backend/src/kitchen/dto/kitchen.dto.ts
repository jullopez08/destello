import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

// Todos los formularios de la cocina. Cantidades en g, ml o und; dinero en pesos.

export const CARD_COLORS = ['banana', 'strawberry', 'lilac', 'peach', 'sky', 'mint'] as const;
/** Figuras: galletas y panes, y los platos de restaurante (con mesas, Julieth 2026-10-21). */
export const COOKIE_LOOKS = ['', 'choco', 'roll', 'bread', 'pump', 'star', 'plate', 'pizza', 'burger', 'coffee', 'soup', 'drink'] as const;
export const SALE_KINDS = ['BOX', 'UNIT', 'SIZES'] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// ── Configuración ──

export class UpdateKitchenSettingsDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80)
  name?: string;

  @IsOptional() @IsString() @MaxLength(30)
  whatsapp?: string;

  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'La hora de corte debe tener el formato HH:mm.' })
  orderCutoff?: string;

  @IsOptional() @IsArray() @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true })
  closedDays?: number[];

  @IsOptional() @IsInt() @Min(5) @Max(90)
  targetMargin?: number;

  /** "¿Atiendes clientes en mesas?": enciende mesas y meseros */
  @IsOptional() @IsBoolean()
  servesTables?: boolean;

  /** "¿Qué preparas sobre todo?": comida o postres y panes (solo los dibujos) */
  @IsOptional() @IsBoolean()
  makesMeals?: boolean;

  /** Minutos que suele tardar un plato y el máximo antes de avisar a la mesa */
  @IsOptional() @IsInt() @Min(1) @Max(180)
  kitchenNormalMin?: number;

  @IsOptional() @IsInt() @Min(1) @Max(240)
  kitchenMaxMin?: number;

  /** Impuesto incluido en los precios: ninguno, al consumo (8 %) o IVA (19 %, franquicias) */
  @IsOptional() @IsIn(['NONE', 'INC', 'IVA'])
  salesTax?: 'NONE' | 'INC' | 'IVA';
}

// Cuenta bancaria o llave Bre-B (type "Llave Bre-B", la llave en number y el
// banco opcional). Las llaves no se validan por tipo: celular, correo, cédula o
// el código alfanumérico del banco, cualquiera sirve para transferir.
export class CreateBankAccountDto {
  @IsString() @MaxLength(60) bank!: string;
  @IsString() @IsNotEmpty() @MaxLength(30) type!: string;
  @IsString() @IsNotEmpty() @MaxLength(120) number!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) owner!: string;
}

export class CreateCourierDto {
  @IsString() @IsNotEmpty() @MaxLength(80) name!: string;
  @IsString() @IsNotEmpty() @MaxLength(30) phone!: string;
}

export class MoveCourierDto {
  @IsIn(['up', 'down']) direction!: 'up' | 'down';
}

export class ProductionCheckDto {
  @IsString() @IsNotEmpty() @MaxLength(80) key!: string;
  @IsBoolean() done!: boolean;
}

// ── Proveedores e insumos ──

export class SupplierDto {
  @IsString() @IsNotEmpty() @MaxLength(80) name!: string;
  @IsOptional() @IsString() @MaxLength(80) contact?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @ValidateIf((_, v) => v !== '') @IsEmail({}, { message: 'Escribe un correo válido, como nombre@correo.com.' }) email?: string;
  @IsOptional() @IsString() @MaxLength(160) address?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @IsIn(CARD_COLORS) color!: string;
  /** Insumos que se le compran a este proveedor */
  @IsArray() @IsString({ each: true }) supplyIds!: string[];
}

export class SupplyDto {
  @IsString() @IsNotEmpty() @MaxLength(80) name!: string;
  @IsIn(['MASS', 'VOLUME', 'UNIT']) kind!: 'MASS' | 'VOLUME' | 'UNIT';
  @IsIn(['INGREDIENT', 'PACKAGING']) category!: 'INGREDIENT' | 'PACKAGING';
  @IsNumber() @Min(0) stock!: number;
  @IsNumber() @Min(0) min!: number;
  /** por g, ml o und */
  /** Por gramo, mililitro o unidad: siempre mayor que cero (Julieth, 2026-10-19) */
  @IsNumber() @IsPositive() cost!: number;
  /** Lo pagado y por cuánto (g, ml o und), tal como se escribió (para mostrarlo igual al editar) */
  @IsOptional() @IsNumber() @IsPositive() pricePaid?: number;
  @IsOptional() @IsNumber() @IsPositive() priceQty?: number;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() supplierId?: string | null;
  /** Tiene fecha de vencimiento (cada compra pide la fecha) */
  @IsOptional() @IsBoolean() perishable?: boolean;
  /** Solo al crear: cuándo vence la existencia inicial de un insumo con vencimiento */
  @IsOptional() @Matches(ISO_DATE) expiresOn?: string;
}

/** «Revisar vencimientos»: varios insumos a la vez */
export class SupplyPerishableItemDto {
  @IsString() @IsNotEmpty() supplyId!: string;
  @IsBoolean() perishable!: boolean;
}

export class SupplyPerishableDto {
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => SupplyPerishableItemDto)
  items!: SupplyPerishableItemDto[];
}

export class PurchaseLineDto {
  @IsString() @IsNotEmpty() supplyId!: string;
  @IsNumber() @Min(0.0001) qty!: number;
  @IsInt() @Min(1) total!: number;
  /** Obligatoria si el insumo tiene vencimiento */
  @IsOptional() @Matches(ISO_DATE) expiresOn?: string;
}

export class CreatePurchaseDto {
  @IsString() @IsNotEmpty() supplierId!: string;
  @Matches(ISO_DATE) date!: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => PurchaseLineDto)
  lines!: PurchaseLineDto[];
}

// ── Recetas, lotes y productos ──

/** Un insumo o una receta (relleno hecho, en gramos), no los dos. */
export class ProductExtraDto {
  @IsOptional() @IsString() @IsNotEmpty() supplyId?: string;
  @IsOptional() @IsString() @IsNotEmpty() recipeId?: string;
  @IsNumber() @Min(0.0001) qty!: number;
}

export class SupplyQtyDto {
  @IsString() @IsNotEmpty() supplyId!: string;
  @IsNumber() @Min(0.0001) qty!: number;
}

export class RecipeDto {
  @IsString() @IsNotEmpty() @MaxLength(80) name!: string;
  @IsNumber() @Min(1) yieldGrams!: number;
  @IsIn(CARD_COLORS) color!: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => SupplyQtyDto)
  items!: SupplyQtyDto[];
}

export class CreateLotDto {
  @IsString() @IsNotEmpty() recipeId!: string;
  @IsNumber() @Min(0.25) @Max(100) batches!: number;
  @IsInt() @Min(1) @Max(60) days!: number;
}

export class ProductDto {
  @IsString() @IsNotEmpty() @MaxLength(80) name!: string;
  @IsIn(['LOT', 'ON_DEMAND']) mode!: 'LOT' | 'ON_DEMAND';
  @IsString() @IsNotEmpty() recipeId!: string;
  @IsNumber() @Min(1) grams!: number;
  @IsIn(COOKIE_LOOKS) look!: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductExtraDto)
  extras?: ProductExtraDto[];
}

export class PresentationItemDto {
  @IsString() @IsNotEmpty() productId!: string;
  @IsInt() @Min(1) units!: number;
  /** Sabor y tamaño: lo que se cobra de más por este sabor */
  @IsOptional() @IsInt() @Min(0) surcharge?: number;
}

export class PresentationSizeDto {
  /** Si viene, se actualiza ese tamaño (los pedidos lo siguen viendo) */
  @IsOptional() @IsString() id?: string;
  @IsString() @IsNotEmpty() @MaxLength(40) name!: string;
  @IsOptional() @IsString() @MaxLength(40) portions?: string;
  @IsOptional() @IsString() @MaxLength(40) mold?: string;
  @IsInt() @Min(1) price!: number;
  /** Gramos de masa por molde; 0 = los del producto */
  @IsNumber() @Min(0) grams!: number;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() packSupplyId?: string | null;
}

// Caja armada: `items` es lo que lleva y `pack` su empaque.
// Por unidad: `price` es por unidad, `items` los sabores (units 1) y `pack` el empaque de siempre.
// Sabor y tamaño: `items` los sabores con su recargo y `sizes` los tamaños; `price` se calcula.
export class PresentationDto {
  @IsString() @IsNotEmpty() @MaxLength(80) name!: string;
  @IsOptional() @IsIn(SALE_KINDS) kind?: (typeof SALE_KINDS)[number];
  @ValidateIf((o: PresentationDto) => o.kind !== 'SIZES') @IsInt() @Min(1) price!: number;
  @IsBoolean() active!: boolean;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => PresentationItemDto)
  items!: PresentationItemDto[];
  @IsArray() @ValidateNested({ each: true }) @Type(() => SupplyQtyDto)
  pack!: SupplyQtyDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PresentationSizeDto)
  sizes?: PresentationSizeDto[];
}

// ── Pedidos y ediciones ──

export class OrderLineDto {
  @IsString() @IsNotEmpty() presentationId!: string;
  @IsInt() @Min(1) qty!: number;
  /** Por unidad y sabor y tamaño: el sabor elegido */
  @IsOptional() @IsString() productId?: string;
  /** Sabor y tamaño: el tamaño elegido */
  @IsOptional() @IsString() sizeId?: string;
  /** Por unidad: otro empaque para este pedido */
  @IsOptional() @IsString() packSupplyId?: string;
}

export class CreateOrderDto {
  @IsString() @IsNotEmpty() @MaxLength(80) customer!: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsIn(['DELIVERY', 'PICKUP']) delivery!: 'DELIVERY' | 'PICKUP';
  @ValidateIf((o: CreateOrderDto) => o.delivery === 'DELIVERY') @IsString() @IsNotEmpty({ message: 'Escribe la dirección de entrega.' }) @MaxLength(160)
  address?: string;
  @IsIn(['TRANSFER', 'CASH']) payment!: 'TRANSFER' | 'CASH';
  @IsInt() @Min(0) fee!: number;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => OrderLineDto)
  lines!: OrderLineDto[];
}

export class SendOrderDto {
  @IsString() @IsNotEmpty() courierId!: string;
}

export class CreateEditionDto {
  @IsString() @IsNotEmpty() @MaxLength(80) name!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @Matches(ISO_DATE) startDate!: string;
  @Matches(ISO_DATE) endDate!: string;
  @IsIn(CARD_COLORS) color!: string;
  @IsIn(COOKIE_LOOKS) look!: string;
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) presentationIds!: string[];
}
