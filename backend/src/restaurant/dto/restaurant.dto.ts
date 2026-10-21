import { Type } from 'class-transformer';
import { CANCEL_REASONS, type CancelReason } from '../cancel-reasons';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class AddTablesDto {
  @IsInt() @Min(1) @Max(50) count!: number;
}

export class RenameTableDto {
  @IsString() @IsNotEmpty() @MaxLength(30) name!: string;
}

export class TicketLineDto {
  @IsString() @IsNotEmpty() presentationId!: string;
  /** Por unidad y sabor y tamaño: el sabor elegido */
  @IsOptional() @IsString() productId?: string;
  /** Sabor y tamaño: el tamaño elegido */
  @IsOptional() @IsString() sizeId?: string;
  @IsInt() @Min(1) @Max(99) qty!: number;
  /** "Sin cebolla", "término medio"… */
  @IsOptional() @IsString() @MaxLength(120) note?: string;
}

export class SendTicketDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(40) @ValidateNested({ each: true }) @Type(() => TicketLineDto) lines!: TicketLineDto[];
}

export class TablePaymentDto {
  @IsIn(['CASH', 'TRANSFER', 'CARD']) method!: 'CASH' | 'TRANSFER' | 'CARD';
  @IsInt() @Min(1) @Max(100_000_000) amount!: number;
}

export class CancelTicketDto {
  @IsIn(CANCEL_REASONS) reason!: CancelReason;
}

export class CloseTableDto {
  /** El cliente acepta la propina sugerida */
  @IsBoolean() tip!: boolean;
  /** Una forma de pago o varias (dividir la cuenta); vacío solo si la mesa no consumió nada */
  @IsArray() @ArrayMaxSize(8) @ValidateNested({ each: true }) @Type(() => TablePaymentDto) payments!: TablePaymentDto[];
}

/** Abrir la caja con la base (el efectivo para dar vueltas; puede ser 0). */
export class OpenDrawerDto {
  @IsInt() @Min(0) @Max(100_000_000) openingCash!: number;
}

/** Efectivo que entra o sale del cajón sin ser una venta. */
export class CashMoveDto {
  @IsIn(['IN', 'OUT']) kind!: 'IN' | 'OUT';
  @IsInt() @Min(1) @Max(100_000_000) amount!: number;
  @IsString() @IsNotEmpty() @MaxLength(80) reason!: string;
}

/** Lo contado al cerrar y, si no cuadró dos veces, qué pasó. */
export class CloseDrawerDto {
  @IsInt() @Min(0) @Max(100_000_000) counted!: number;
  @IsOptional() @IsString() @MaxLength(200) note?: string;
}
