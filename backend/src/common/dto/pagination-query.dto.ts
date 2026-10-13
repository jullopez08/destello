import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// Shared page/limit shape for any paginated list endpoint — page is 1-based,
// limit capped at 100 so a caller can't force an unbounded table scan.
// Mirrors DoctorBlockHistoryQueryDto (doctor-block/dto/doctor-block-history-query.dto.ts),
// the first endpoint to establish this pattern.
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
