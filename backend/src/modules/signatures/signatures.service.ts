import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { createHash, createHmac } from 'crypto';

export interface SignInput {
  entityType: string;
  entityId: string;
  /** 인증된 사용자 ID — 컨트롤러가 req.user.id 로 강제 주입 (body 위조 방지) */
  signerId: string;
  /** 비밀번호 재인증 */
  password: string;
  signatureType?: string;
  signatureData?: string;
  isEvidence?: boolean;
  evidenceTag?: string;
  comment?: string;
  ipAddress?: string;
}

export interface VerifyResult {
  ok: boolean;
  errors: string[];
}

/** 서명 HMAC용 비밀키 (운영 환경에서는 SIGNATURE_SECRET 환경변수 사용) */
function signatureSecret(): string {
  return process.env.SIGNATURE_SECRET || process.env.JWT_SECRET || 'dev-secret';
}

function comparePassword(password: string, hash: string): boolean {
  if (!hash) return false;
  if (hash.startsWith('$2')) return bcrypt.compareSync(password, hash);
  return Buffer.from(password).toString('base64') === hash;
}

@Injectable()
export class SignaturesService {
  constructor(private prisma: PrismaService) {}

  /** 서명 대상 콘텐츠의 표준 해시 (버전 포함) */
  computeContentHash(item: any): string {
    const canonical = JSON.stringify({
      version: item.version,
      title: item.title,
      description: item.description,
      status: item.status,
      customFields: item.customFields,
    });
    return createHash('sha256').update(canonical).digest('hex');
  }

  /** HMAC over entityType/entityId/version/contentHash/signerId/signedAt */
  computeSignatureHash(params: {
    entityType: string;
    entityId: string;
    signedVersionId: string | number;
    contentHash: string;
    signerId: string;
    signedAt: Date;
  }): string {
    const message = [
      params.entityType,
      params.entityId,
      String(params.signedVersionId),
      params.contentHash,
      params.signerId,
      params.signedAt.toISOString(),
    ].join('|');
    return createHmac('sha256', signatureSecret()).update(message).digest('hex');
  }

  /** 서명 저장 (비밀번호 재인증 + 버전/콘텐츠 바인딩 HMAC) */
  async sign(data: SignInput) {
    // 1) 비밀번호 재인증
    const user = await this.prisma.user.findUnique({ where: { id: data.signerId } });
    if (!user) {
      throw new BadRequestException(` signer를 찾을 수 없습니다: ${data.signerId}`);
    }
    if (!data.password || !comparePassword(data.password, (user as any).passwordHash)) {
      throw new BadRequestException('비밀번호 재인증에 실패했습니다.');
    }

    // 2) 서명 대상 조회 (문서는 page = workItemId 이므로 동일하게 조회)
    const item = await this.prisma.workItem.findUnique({ where: { id: data.entityId } });
    if (!item) {
      throw new NotFoundException(`서명 대상을 찾을 수 없습니다: ${data.entityId}`);
    }

    // 3) 중복/취소 서명 확인
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

    // 4) 해시 계산 후 저장
    const contentHash = this.computeContentHash(item);
    const signedAt = new Date();
    const signatureHash = this.computeSignatureHash({
      entityType: data.entityType,
      entityId: data.entityId,
      signedVersionId: item.version,
      contentHash,
      signerId: data.signerId,
      signedAt,
    });

    return this.prisma.electronicSignature.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        signerId: data.signerId,
        signatureType: data.signatureType || 'typed',
        signatureData: data.signatureData ?? '',
        signatureHash,
        contentHash,
        signedVersionId: String(item.version),
        verificationStatus: 'valid',
        isEvidence: data.isEvidence !== false,
        evidenceTag: data.evidenceTag ?? null,
        comment: data.comment ?? null,
        ipAddress: data.ipAddress ?? null,
        signedAt,
      } as any,
    });
  }

  /** 서명 검증: 취소 여부 + 콘텐츠 변경 여부 + HMAC 무결성 */
  async verify(entityType: string, entityId: string): Promise<VerifyResult> {
    const sigs = await this.prisma.electronicSignature.findMany({
      where: { entityType, entityId },
    });
    if (!sigs.length) {
      return { ok: false, errors: ['서명이 없습니다.'] };
    }

    const errors: string[] = [];
    const item = await this.prisma.workItem.findUnique({ where: { id: entityId } });
    const currentHash = item ? this.computeContentHash(item) : null;

    for (const sig of sigs) {
      if (sig.revokedAt) {
        errors.push(`서명 ${sig.id}: 취소된 서명입니다.`);
        continue;
      }
      if (!sig.signatureHash || !sig.contentHash || sig.signedVersionId == null) {
        errors.push(`서명 ${sig.id}: 서명 해시 정보가 없습니다.`);
        continue;
      }
      if (currentHash !== sig.contentHash) {
        errors.push(`서명 ${sig.id}: 서명 이후 내용이 변경되었습니다.`);
        await this.prisma.electronicSignature.update({
          where: { id: sig.id },
          data: { verificationStatus: 'invalid' },
        } as any);
        continue;
      }
      const expected = this.computeSignatureHash({
        entityType,
        entityId,
        signedVersionId: sig.signedVersionId,
        contentHash: sig.contentHash,
        signerId: sig.signerId,
        signedAt: sig.signedAt,
      });
      if (expected !== sig.signatureHash) {
        errors.push(`서명 ${sig.id}: 서명 해시가 유효하지 않습니다.`);
        await this.prisma.electronicSignature.update({
          where: { id: sig.id },
          data: { verificationStatus: 'invalid' },
        } as any);
      }
    }

    return { ok: errors.length === 0, errors };
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
      data: { revokedAt: new Date(), revokedById, verificationStatus: 'invalid' },
    } as any);
  }
}
