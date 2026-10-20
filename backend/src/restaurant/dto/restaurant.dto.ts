import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

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
