import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ProcessTemplateEntry {
  code: string;
  name: string;
  description?: string;
  isApplicable?: boolean;
}

/**
 * 조직 템플릿 레지스트리 서비스.
 * 템플릿 패키지/버전 조회와, 프로젝트 생성 시 템플릿 스냅샷을 인스턴스화한다.
 */
@Injectable()
export class TemplateService {
  constructor(private prisma: PrismaService) {}

  /**
   * 조직의 게시된 템플릿 패키지 목록을 반환한다.
   */
  async listPackages(orgId: string) {
    return this.prisma.templatePackage.findMany({
      where: { orgId, isPublished: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 템플릿 버전을 조회한다.
   */
  async getVersion(packageId: string, version: number) {
    const templateVersion = await this.prisma.templateVersion.findFirst({
      where: { packageId, version },
    });
    if (!templateVersion) {
      throw new NotFoundException('템플릿 버전을 찾을 수 없습니다.');
    }
    return templateVersion;
  }

  /**
   * 주어진 스페이스에 템플릿 버전을 인스턴스화한다.
   * 템플릿의 프로세스 목록을 ProcessWorkspace 로 생성하고 반환한다.
   * 공간은 이미 생성된 상태여야 하며, templateVersionId 는 스페이스에 고정된다.
   */
  async instantiate(
    spaceId: string,
    templateVersionId: string,
    createdById: string,
  ) {
    const templateVersion = await this.prisma.templateVersion.findUnique({
      where: { id: templateVersionId },
    });
    if (!templateVersion) {
      throw new NotFoundException('템플릿 버전을 찾을 수 없습니다.');
    }

    const processes: ProcessTemplateEntry[] =
      (templateVersion.processes as unknown as ProcessTemplateEntry[]) ?? [];

    const workspaces = await Promise.all(
      processes
        .filter((p) => p.isApplicable !== false)
        .map((p) =>
          this.prisma.processWorkspace.create({
            data: {
              spaceId,
              processCode: p.code,
              name: p.name,
              description: p.description ?? null,
              isApplicable: true,
            },
          }),
        ),
    );

    return { spaceId, workspaces };
  }
}
