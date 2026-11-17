import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class UploadService {
  private s3 = new S3Client({
    endpoint: process.env.MINIO_ENDPOINT || 'http://minio:9000',
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.MINIO_USER || 'minioadmin',
      secretAccessKey: process.env.MINIO_PASSWORD || 'minioadmin',
    },
    forcePathStyle: true,
  });

  constructor(private prisma: PrismaService) {}

  async upload(file: Express.Multer.File, targetType: string, targetId: string, userId: string) {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'text/markdown'];
    if (!allowed.includes(file.mimetype)) throw new BadRequestException('허용되지 않는 파일 형식');
    if (file.size > 50 * 1024 * 1024) throw new BadRequestException('파일 크기가 50MB를 초과합니다');

    const path = `${targetType}/${targetId}/${Date.now()}_${file.originalname}`;
    await this.s3.send(new PutObjectCommand({ Bucket: 'alm-attachments', Key: path, Body: file.buffer, ContentType: file.mimetype }));

    return this.prisma.attachment.create({
      data: { targetType, targetId, fileName: file.originalname, filePath: path, fileSize: file.size, mimeType: file.mimetype, uploadedById: userId },
    });
  }

  async getAttachment(id: string) {
    const att = await this.prisma.attachment.findUnique({ where: { id } });
    if (!att) throw new NotFoundException(`Attachment not found: ${id}`);
    return att;
  }

  async deleteAttachment(id: string) {
    const att = await this.getAttachment(id);
    await this.s3.send(new DeleteObjectCommand({ Bucket: 'alm-attachments', Key: att.filePath }));
    await this.prisma.attachment.update({ where: { id }, data: { isDeleted: true } });
  }
}
