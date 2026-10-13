import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WompiService } from './wompi.service';

@Module({
  imports: [HttpModule],
  providers: [WompiService],
  exports: [WompiService],
})
export class WompiModule {}
