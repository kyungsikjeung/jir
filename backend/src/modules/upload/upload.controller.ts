import { Controller, Post, Get, Delete, Param, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File, @Param() params: any) {
    return this.uploadService.upload(file, params.targetType || 'general', params.targetId || 'general', params.userId || 'system');
  }

  @Get(':id')
  async getAttachment(@Param('id') id: string) {
    return this.uploadService.getAttachment(id);
  }

  @Delete(':id')
  async deleteAttachment(@Param('id') id: string) {
    await this.uploadService.deleteAttachment(id);
    return { success: true };
  }
}
