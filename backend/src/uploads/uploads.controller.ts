import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UploadsService } from './uploads.service';
import { isAllowedImage, LOGO_MIME_TYPES } from './image-signature';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('logo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!LOGO_MIME_TYPES.includes(file.mimetype)) {
          return cb(
            new BadRequestException('El logo debe ser una imagen PNG, JPG o WebP.'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo.');
    }
    if (!isAllowedImage(file.buffer)) {
      throw new BadRequestException('El logo debe ser una imagen PNG, JPG o WebP.');
    }
    const url = await this.uploadsService.uploadLogo(file.buffer);
    return { url };
  }
}
