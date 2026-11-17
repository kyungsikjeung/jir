import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StakeholdersService {
  constructor(private prisma: PrismaService) {}

  async getTypes() {
    return this.prisma.stakeholderType.findMany();
  }

  async getOrganizations(orgId: string) {
    return this.prisma.externalOrganization.findMany({ where: { orgId } });
  }

  async invite(data: any, invitedBy: string) {
    const token = crypto.randomUUID();
    return this.prisma.invitation.create({
      data: {
        orgId: data.orgId,
        email: data.email,
        stakeholderTypeId: data.stakeholderTypeId,
        externalOrgId: data.externalOrgId,
        allowedSpaces: data.allowedSpaces || [],
        dataFilter: data.dataFilter || {},
        token,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        invitedById: invitedBy,
      },
    });
  }

  async getPortalDashboard(spaceKey: string, userId: string) {
    const space = await this.prisma.space.findUnique({ where: { key: spaceKey } });
    if (!space) throw new NotFoundException(`Space not found: ${spaceKey}`);
    const pages = await this.prisma.workItem.findMany({
      where: { spaceId: space.id, typeId: 'page-type-id', status: 'released' },
    });
    const requirements = await this.prisma.workItem.findMany({
      where: { spaceId: space.id, typeId: 'requirement-type-id', status: { in: ['approved', 'released'] } },
    });
    return { space, pages, requirements };
  }
}
