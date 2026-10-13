import { Injectable, OnModuleInit } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadsService implements OnModuleInit {
  onModuleInit() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadLogo(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: 'organization-logos', resource_type: 'image' },
          (error, result) => {
            if (error) reject(new Error(error.message));
            else if (!result) reject(new Error('Cloudinary no devolvió resultado.'));
            else resolve(result.secure_url);
          },
        )
        .end(buffer);
    });
  }
}
