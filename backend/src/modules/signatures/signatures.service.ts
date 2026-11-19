import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SignInput {
  entityType: string;
  entityId: string;
  signerId: string;
  signatureType?: string;
  signatureData?: string;
  isEvidence?: boolean;
  evidenceTag?: string;
  comment?: string;
  ipAddress?: string;
}

@Injectable()
export class SignaturesService {
  constructor(private prisma: PrismaService) {}

  /** 서명 저장 (entityType+entityId+signerId 유니크, 중복 금지) */
  async sign(data: SignInput) {
    const existing = await this.prisma.electronicSignature.findFirst({
      where: {
        entityType: data.entityType,
        entityId: data.entityId,
        signerId: data.signerId,
      },
    });
    if (existing) {
      if (existing.revokedAt) {
        throw new BadRequestException(`Signature already revoked: ${data.entityType}:${data.entityId}`);
      }
      return existing;
    }
    return this.prisma.electronicSignature.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        signerId: data.signerId,
        signatureType: data.signatureType || 'typed',
        signatureData: data.signatureData ?? '',
        isEvidence: data.isEvidence !== false,
        evidenceTag: data.evidenceTag ?? null,
        comment: data.comment ?? null,
        ipAddress: data.ipAddress ?? null,
      },
    });
  }

  /** 서명 조회 (entityType + entityId 기준, signedAt 최신순, signer 정보 부착) */
  async findByEntity(entityType: string, entityId: string) {
    const sigs = await this.prisma.electronicSignature.findMany({
      where: { entityType, entityId },
      orderBy: { signedAt: 'desc' },
    });
    const signerIds = Array.from(new Set(sigs.map((s) => s.signerId)));
    const users = signerIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: signerIds } },
          select: { id: true, displayName: true, email: true },
        })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));
    return sigs.map((s) => ({ ...s, signer: userById.get(s.signerId) ?? null }));
  }

  /** 서명 취소 (revokedAt/revokedById) */
  async revoke(id: string, revokedById: string) {
    const sig = await this.prisma.electronicSignature.findUnique({ where: { id } });
    if (!sig) throw new NotFoundException(`Signature not found: ${id}`);
    if (sig.revokedAt) return sig;
    return this.prisma.electronicSignature.update({
      where: { id },
      data: { revokedAt: new Date(), revokedById },
    });
  }
}
