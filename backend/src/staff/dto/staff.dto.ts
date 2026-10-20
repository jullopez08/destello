import { StaffRole } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

const PIN = /^\d{4}$/;
const PIN_MESSAGE = 'El PIN tiene 4 números.';

// El PIN del mesero lo genera Destello: no se recibe.
export class CreateStaffDto {
  @IsString() @IsNotEmpty() @MaxLength(60) name!: string;
  @IsEnum(StaffRole) role!: StaffRole;
}

export class ClaimDeviceDto {
  @IsString() @Length(20, 100) token!: string;
}

export class StaffLoginDto {
  @IsOptional() @Matches(PIN, { message: PIN_MESSAGE }) pin?: string;
}
