import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TestsService {
  constructor(private prisma: PrismaService) {}

  async findTestCases(spaceKey: string, filters?: { testType?: string }) {
    const space = await this.prisma.space.findUnique({ where: { key: spaceKey } });
    if (!space) throw new NotFoundException(`Space not found: ${spaceKey}`);
    const type = await this.prisma.workItemType.findFirst({ where: { spaceId: space.id, name: 'test_case' } });
    const where: any = type ? { spaceId: space.id, typeId: type.id } : { spaceId: space.id };
    return this.prisma.workItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTestCase(spaceKey: string, data: any, userId: string) {
    const space = await this.prisma.space.findUnique({ where: { key: spaceKey } });
    if (!space) throw new NotFoundException(`Space not found: ${spaceKey}`);
    const type = await this.prisma.workItemType.findFirst({ where: { spaceId: space.id, name: 'test_case' } });
    const count = await this.prisma.workItem.count({ where: { spaceId: space.id } });
    const key = `${space.key}-${count + 1}`;

    const workItem = await this.prisma.workItem.create({
      data: {
        spaceId: space.id,
        typeId: type.id,
        key,
        title: data.title,
        description: data.description,
        status: 'open',
        priority: data.priority || 'medium',
        assigneeId: data.assigneeId,
        reporterId: userId,
        aspiceProcess: data.aspiceProcess || 'SWE.5',
        body: data.body,
      },
    });

    await this.prisma.testCase.create({
      data: {
        workItemId: workItem.id,
        testType: data.testType || 'unit',
        preconditions: data.preconditions,
        postconditions: data.postconditions,
        steps: data.steps || [],
        isAutomated: data.isAutomated || false,
        testEnvironment: data.testEnvironment,
      },
    });

    return workItem;
  }

  async createTestRun(spaceKey: string, data: any, userId: string) {
    const space = await this.prisma.space.findUnique({ where: { key: spaceKey } });
    if (!space) throw new NotFoundException(`Space not found: ${spaceKey}`);
    return this.prisma.testRun.create({
      data: {
        spaceId: space.id,
        name: data.name,
        description: data.description,
        testSuiteId: data.testSuiteId,
        environment: data.environment,
        buildVersion: data.buildVersion,
        status: 'planned',
        assignedToId: data.assignedToId,
        createdById: userId,
      },
    });
  }

  async recordTestResult(testRunId: string, data: any, userId: string) {
    return this.prisma.testResult.create({
      data: {
        testRunId,
        testCaseId: data.testCaseId,
        result: data.result,
        actualResult: data.actualResult,
        evidence: data.evidence || [],
        executedById: userId,
        durationMs: data.durationMs,
      },
    });
  }
}
