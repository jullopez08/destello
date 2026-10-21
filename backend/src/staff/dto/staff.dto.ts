import { StaffRole } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString, Length, Matches, MaxLength } from 'class-validator';

const PIN = /^\d{4}$/;
const PIN_MESSAGE = 'El PIN tiene 4 números.';

// El PIN (mesero y cocina) lo genera Destello: no se recibe.
export class CreateStaffDto {
  @IsString() @IsNotEmpty() @MaxLength(60) name!: string;
  @IsEnum(StaffRole) role!: StaffRole;
}

export class StaffLinkDto {
  @IsString() @Length(20, 100) token!: string;
}

export class ClaimDeviceDto extends StaffLinkDto {
  @Matches(PIN, { message: PIN_MESSAGE }) pin!: string;
}

export class StaffLoginDto {
  @Matches(PIN, { message: PIN_MESSAGE }) pin!: string;
}
