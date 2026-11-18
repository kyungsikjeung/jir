/* eslint-disable */
// ASPICE ALM seed data (idempotent)
// 실행: npm run prisma:seed

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ORG_ID = 'default-org';
const ADMIN_EMAIL = 'admin@alm.local';
const ADMIN_PASSWORD = 'admin1234';

// 인증 서비스와 동일한 방식 (bcryptjs)
const hashPassword = (pw) => bcrypt.hashSync(pw, 10);

const ROLES = [
  { name: 'super_admin', description: '전체 시스템 관리자', isSuperAdmin: true, isAdmin: true },
  { name: 'org_admin', description: '조직 관리자', isAdmin: true },
  { name: 'project_admin', description: '프로젝트 관리자', isAdmin: true },
  { name: 'developer', description: '개발자' },
  { name: 'tester', description: '테스터' },
  { name: 'reviewer', description: '리뷰어' },
  { name: 'viewer', description: '읽기 전용' },
  { name: 'external_stakeholder', description: '외부 이해관계자 (포털)' },
];

const PROCESS_AREAS = [
  ['SYS.1', 'Requirements Elicitation', 'SYS', 2],
  ['SYS.2', 'System Requirements Analysis', 'SYS', 2],
  ['SYS.3', 'System Architectural Design', 'SYS', 2],
  ['SYS.4', 'System Integration and Integration Test', 'SYS', 2],
  ['SYS.5', 'System Qualification Test', 'SYS', 2],
  ['SWE.1', 'Software Requirements Analysis', 'SWE', 2],
  ['SWE.2', 'Software Architectural Design', 'SWE', 2],
  ['SWE.3', 'Software Detailed Design and Unit Construction', 'SWE', 2],
  ['SWE.4', 'Software Unit Verification', 'SWE', 2],
  ['SWE.5', 'Software Integration and Integration Test', 'SWE', 2],
  ['SWE.6', 'Software Qualification Test', 'SWE', 3],
  ['SUP.1', 'Quality Assurance', 'SUP', 2],
  ['SUP.8', 'Configuration Management', 'SUP', 2],
  ['SUP.9', 'Problem Resolution Management', 'SUP', 2],
  ['SUP.10', 'Change Request Management', 'SUP', 2],
  ['MAN.3', 'Project Management', 'MAN', 2],
  ['MAN.5', 'Risk Management', 'MAN', 2],
  ['ACQ.4', 'Supplier Monitoring', 'ACQ', 2],
  ['SPL.2', 'Product Release', 'SPL', 2],
];

const DELIVERABLES = [
  ['SYS.1', 'Stakeholder Requirements', 'SYS1-REQ', true],
  ['SYS.2', 'System Requirements Specification', 'SYS2-SRS', true],
  ['SYS.3', 'System Architecture Design', 'SYS3-SAD', true],
  ['SWE.1', 'Software Requirements Specification', 'SWE1-SRS', true],
  ['SWE.2', 'Software Architecture Design', 'SWE2-SAD', true],
  ['SWE.3', 'Software Detailed Design', 'SWE3-SDD', true],
  ['SWE.4', 'Unit Verification Report', 'SWE4-UVR', true],
  ['SWE.5', 'Integration Test Report', 'SWE5-ITR', true],
  ['SWE.6', 'Qualification Test Report', 'SWE6-QTR', true],
  ['SUP.8', 'Configuration Management Plan', 'SUP8-CMP', true],
  ['SUP.10', 'Change Request Log', 'SUP10-CRL', true],
  ['MAN.3', 'Project Management Plan', 'MAN3-PMP', true],
  ['MAN.5', 'Risk Management Plan', 'MAN5-RMP', false],
];

const WORK_ITEM_TYPES = [
  ['epic', 0, false, null],
  ['requirement', 1, false, 'SWE.1'],
  ['task', 2, false, null],
  ['bug', 2, false, null],
  ['test_case', 2, false, 'SWE.4'],
  ['page', 0, false, null],
];

async function main() {
  console.log('▶ Seed 시작');

  // ── Organization ─────────────────────────────────────────
  await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: {},
    create: {
      id: ORG_ID,
      name: 'TOVIS Automotive',
      slug: 'alm',
      domain: 'alm.local',
      plan: 'free',
    },
  });

  // ── Roles ────────────────────────────────────────────────
  const roleIdByName = {};
  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { orgId_name: { orgId: ORG_ID, name: r.name } },
      update: { description: r.description },
      create: {
        orgId: ORG_ID,
        name: r.name,
        description: r.description,
        isSystem: true,
        isAdmin: !!r.isAdmin,
        isSuperAdmin: !!r.isSuperAdmin,
      },
    });
    roleIdByName[r.name] = role.id;
  }
  console.log(`  ✓ Roles: ${Object.keys(roleIdByName).length}`);

  // ── Users ────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash: hashPassword(ADMIN_PASSWORD) },
    create: {
      orgId: ORG_ID,
      email: ADMIN_EMAIL,
      passwordHash: hashPassword(ADMIN_PASSWORD),
      displayName: '시스템 관리자',
      title: 'Super Admin',
      department: 'IT',
      isInternal: true,
      isVerified: true,
      isApproved: true,
      isActive: true,
    },
  });

  const dev = await prisma.user.upsert({
    where: { email: 'dev@alm.local' },
    update: { passwordHash: hashPassword('dev1234') },
    create: {
      orgId: ORG_ID,
      email: 'dev@alm.local',
      passwordHash: hashPassword('dev1234'),
      displayName: '개발자',
      title: 'Software Engineer',
      department: 'SW Development',
      isInternal: true,
      isVerified: true,
      isApproved: true,
    },
  });

  const tester = await prisma.user.upsert({
    where: { email: 'tester@alm.local' },
    update: { passwordHash: hashPassword('test1234') },
    create: {
      orgId: ORG_ID,
      email: 'tester@alm.local',
      passwordHash: hashPassword('test1234'),
      displayName: '테스터',
      title: 'Test Engineer',
      department: 'QA',
      isInternal: true,
      isVerified: true,
      isApproved: true,
    },
  });

  const auditor = await prisma.user.upsert({
    where: { email: 'auditor@external.test' },
    update: { passwordHash: hashPassword('audit1234') },
    create: {
      orgId: ORG_ID,
      email: 'auditor@external.test',
      passwordHash: hashPassword('audit1234'),
      displayName: '외부 감사자',
      title: 'External Auditor',
      department: 'TUV',
      isInternal: false,
      isExternal: true,
      isVerified: true,
      isApproved: true,
    },
  });
  console.log('  ✓ Users: 4');

  // ── Org-level role assignments ───────────────────────────
  const existingRole = await prisma.userRole.findFirst({ where: { userId: admin.id, roleId: roleIdByName['super_admin'] } });
  if (!existingRole) {
    await prisma.userRole.create({ data: { userId: admin.id, roleId: roleIdByName['super_admin'] } });
  }

  // ── Process Areas ────────────────────────────────────────
  let sort = 0;
  for (const [code, name, category, level] of PROCESS_AREAS) {
    await prisma.processArea.upsert({
      where: { code },
      update: { name, category, level },
      create: {
        code,
        name,
        category,
        level,
        description: `${code} — ${name}`,
        requiredWorkProducts: [],
        sortOrder: sort++,
      },
    });
  }
  console.log(`  ✓ Process areas: ${PROCESS_AREAS.length}`);

  // ── ASPICE Deliverables ──────────────────────────────────
  for (const [processCode, name, shortName, isMandatory] of DELIVERABLES) {
    const existing = await prisma.aspiceDeliverable.findFirst({ where: { processCode, name } });
    if (!existing) {
      await prisma.aspiceDeliverable.create({
        data: { processCode, name, shortName, isMandatory, description: `${processCode} work product` },
      });
    }
  }
  console.log(`  ✓ Deliverables: ${DELIVERABLES.length}`);

  // ── Space ────────────────────────────────────────────────
  const space = await prisma.space.upsert({
    where: { key: 'DEMO' },
    update: {},
    create: {
      orgId: ORG_ID,
      key: 'DEMO',
      name: 'Demo ECU Project',
      description: 'ASPICE Level 2 데모 프로젝트 (속도계 ECU)',
      spaceType: 'software',
      aspiceLevel: '2',
      automotiveDomain: 'Powertrain',
      processProfile: 'default',
      createdById: admin.id,
    },
  });
  console.log(`  ✓ Space: ${space.key} (${space.id})`);

  // ── Space members ────────────────────────────────────────
  const members = [
    [admin.id, roleIdByName['project_admin']],
    [dev.id, roleIdByName['developer']],
    [tester.id, roleIdByName['tester']],
    [auditor.id, roleIdByName['external_stakeholder']],
  ];
  for (const [userId, roleId] of members) {
    const exists = await prisma.spaceMember.findFirst({ where: { spaceId: space.id, userId } });
    if (!exists) {
      await prisma.spaceMember.create({ data: { spaceId: space.id, userId, roleId, addedById: admin.id } });
    }
  }

  // ── R&R 매트릭스 (ASPICE 기본 책임) ───────────────────────
  const RR_MATRIX = [
    ['ACQ.4', 'project_admin', 'owner'],
    ['ACQ.4', 'developer', 'contributor'],
    ['ACQ.4', 'tester', 'viewer'],
    ['MAN.3', 'project_admin', 'owner'],
    ['MAN.3', 'developer', 'contributor'],
    ['MAN.3', 'tester', 'reviewer'],
    ['MAN.5', 'project_admin', 'owner'],
    ['MAN.5', 'developer', 'contributor'],
    ['MAN.5', 'tester', 'reviewer'],
    ['SYS.1', 'project_admin', 'reviewer'],
    ['SYS.1', 'developer', 'owner'],
    ['SYS.1', 'tester', 'contributor'],
    ['SYS.2', 'project_admin', 'reviewer'],
    ['SYS.2', 'developer', 'owner'],
    ['SYS.2', 'tester', 'contributor'],
    ['SYS.3', 'project_admin', 'reviewer'],
    ['SYS.3', 'developer', 'owner'],
    ['SYS.3', 'tester', 'viewer'],
    ['SWE.1', 'project_admin', 'reviewer'],
    ['SWE.1', 'developer', 'owner'],
    ['SWE.1', 'tester', 'contributor'],
    ['SWE.2', 'project_admin', 'reviewer'],
    ['SWE.2', 'developer', 'owner'],
    ['SWE.2', 'tester', 'viewer'],
    ['SWE.3', 'project_admin', 'reviewer'],
    ['SWE.3', 'developer', 'owner'],
    ['SWE.3', 'tester', 'viewer'],
    ['SWE.4', 'project_admin', 'viewer'],
    ['SWE.4', 'developer', 'contributor'],
    ['SWE.4', 'tester', 'owner'],
    ['SWE.5', 'project_admin', 'viewer'],
    ['SWE.5', 'developer', 'contributor'],
    ['SWE.5', 'tester', 'owner'],
    ['SWE.6', 'project_admin', 'viewer'],
    ['SWE.6', 'developer', 'contributor'],
    ['SWE.6', 'tester', 'owner'],
    ['SUP.1', 'project_admin', 'reviewer'],
    ['SUP.1', 'tester', 'owner'],
    ['SUP.8', 'project_admin', 'owner'],
    ['SUP.8', 'developer', 'viewer'],
    ['SUP.8', 'tester', 'viewer'],
    ['SUP.9', 'project_admin', 'reviewer'],
    ['SUP.9', 'developer', 'owner'],
    ['SUP.9', 'tester', 'contributor'],
    ['SUP.10', 'project_admin', 'owner'],
    ['SUP.10', 'developer', 'contributor'],
    ['SUP.10', 'tester', 'reviewer'],
  ];
  for (const [processCode, roleName, responsibility] of RR_MATRIX) {
    const roleId = roleIdByName[roleName];
    if (!roleId) continue;
    await prisma.roleResponsibility.upsert({
      where: {
        roleId_spaceId_aspiceProcess: {
          roleId,
          spaceId: space.id,
          aspiceProcess: processCode,
        },
      },
      update: {},
      create: {
        roleId,
        spaceId: space.id,
        aspiceProcess: processCode,
        responsibility,
        isPrimary: responsibility === 'owner',
      },
    });
  }
  console.log(`  ✓ R&R responsibilities: ${RR_MATRIX.length}`);

  // ── Work item types ──────────────────────────────────────
  const typeIdByName = {};
  for (const [name, hierarchyLevel, isSubtask, aspiceProcess] of WORK_ITEM_TYPES) {
    const t = await prisma.workItemType.upsert({
      where: { spaceId_name: { spaceId: space.id, name } },
      update: {},
      create: { spaceId: space.id, name, hierarchyLevel, isSubtask, aspiceProcess },
    });
    typeIdByName[name] = t.id;
  }
  console.log(`  ✓ Work item types: ${Object.keys(typeIdByName).length}`);

  // ── Space process areas + checklists ─────────────────────
  const applicable = PROCESS_AREAS.map((p) => p[0]);
  for (const code of applicable) {
    await prisma.spaceProcessArea.upsert({
      where: { spaceId_processCode: { spaceId: space.id, processCode: code } },
      update: {},
      create: { spaceId: space.id, processCode: code, isApplicable: true },
    });

    const checklistItems = [
      ['프로세스 계획 수립', '프로세스 수행 계획이 문서화되어 있는가'],
      ['작업 산출물 작성', '필수 작업 산출물이 작성되었는가'],
      ['리뷰 및 승인', '산출물에 대한 리뷰와 승인이 완료되었는가'],
      ['양방향 추적성', '상위/하위 요구사항 및 테스트와 추적 링크가 유지되는가'],
    ];
    for (const [itemName, description] of checklistItems) {
      const exists = await prisma.complianceChecklist.findFirst({
        where: { spaceId: space.id, processCode: code, itemName },
      });
      if (!exists) {
        await prisma.complianceChecklist.create({
          data: { spaceId: space.id, processCode: code, itemName, description, isRequired: true, status: 'not_started' },
        });
      }
    }
  }
  console.log(`  ✓ Applicable processes: ${applicable.length}`);

  // ── Workflow + states ────────────────────────────────────
  let workflow = await prisma.workflow.findFirst({ where: { spaceId: space.id, name: 'Default Workflow' } });
  if (!workflow) {
    workflow = await prisma.workflow.create({
      data: {
        spaceId: space.id,
        name: 'Default Workflow',
        description: '기본 ASPICE 워크플로우',
        isDefault: true,
        createdById: admin.id,
      },
    });
  }

  const stateDefs = [
    ['Draft', 'in_progress', true, false, '#9CA3AF', 0],
    ['In Review', 'in_progress', false, false, '#F59E0B', 1],
    ['Approved', 'done', false, false, '#10B981', 2],
    ['Released', 'done', false, true, '#2563EB', 3],
    ['Obsolete', 'done', false, true, '#6B7280', 4],
  ];
  const stateIdByName = {};
  for (const [name, category, isInitial, isTerminal, color, position] of stateDefs) {
    const s = await prisma.workflowState.upsert({
      where: { workflowId_name: { workflowId: workflow.id, name } },
      update: {},
      create: { workflowId: workflow.id, name, category, isInitial, isTerminal, color, position },
    });
    stateIdByName[name] = s.id;
  }

  const transitions = [
    ['Draft → In Review', 'Draft', 'In Review'],
    ['In Review → Approved', 'In Review', 'Approved'],
    ['In Review → Draft', 'In Review', 'Draft'],
    ['Approved → Released', 'Approved', 'Released'],
    ['Any → Obsolete', null, 'Obsolete'],
  ];
  for (const [name, from, to] of transitions) {
    const fromId = from ? stateIdByName[from] : null;
    const existing = await prisma.workflowTransition.findFirst({
      where: { workflowId: workflow.id, fromStateId: fromId, toStateId: stateIdByName[to] },
    });
    if (!existing) {
      await prisma.workflowTransition.create({
        data: {
          workflowId: workflow.id,
          name,
          fromStateId: fromId,
          toStateId: stateIdByName[to],
          isGlobal: from === null,
          position: 0,
        },
      });
    }
  }
  console.log('  ✓ Workflow: Default Workflow (5 states, 5 transitions)');

  // ── Sample work items ────────────────────────────────────
  const wi = async (key, data, typeName, extra = {}) => {
    const item = await prisma.workItem.upsert({
      where: { spaceId_key: { spaceId: space.id, key } },
      update: {},
      create: {
        spaceId: space.id,
        typeId: typeIdByName[typeName],
        key,
        labels: [],
        workflowStateId: stateIdByName['Draft'],
        ...data,
      },
    });
    if (extra.requirement) {
      const exists = await prisma.requirement.findUnique({ where: { workItemId: item.id } });
      if (!exists) {
        await prisma.requirement.create({ data: { workItemId: item.id, reqType: extra.requirement.reqType, ...extra.requirement } });
      }
    }
    if (extra.testCase) {
      const exists = await prisma.testCase.findUnique({ where: { workItemId: item.id } });
      if (!exists) {
        await prisma.testCase.create({ data: { workItemId: item.id, ...extra.testCase } });
      }
    }
    if (extra.page) {
      const exists = await prisma.page.findUnique({ where: { workItemId: item.id } });
      if (!exists) {
        await prisma.page.create({ data: { workItemId: item.id, ...extra.page } });
      }
    }
    return item;
  };

  const req1 = await wi(
    'DEMO-1',
    {
      title: '시스템 요구사항: 차량 속도를 계기판에 표시해야 한다',
      description: '시스템은 CAN 버스를 통해 수신한 차량 속도를 계기판에 표시해야 한다.',
      status: 'open',
      priority: 'high',
      reporterId: admin.id,
      assigneeId: dev.id,
      aspiceProcess: 'SYS.2',
      asilLevel: 'B',
      estimatedHours: 8,
      progressPercent: 100,
      dueDate: new Date('2026-11-10T00:00:00.000Z'),
      bodyText: '시스템은 CAN 버스를 통해 수신한 차량 속도를 계기판에 표시해야 한다.',
    },
    'requirement',
    { requirement: { reqType: 'system', asilLevel: 'B', safetyRelated: true, verificationMethod: 'test', acceptanceCriteria: '속도 표시 오차 ±1 km/h 이내' } },
  );

  const req2 = await wi(
    'DEMO-2',
    {
      title: '소프트웨어 요구사항: CAN 신호를 속도 값으로 변환한다',
      description: 'CAN 메시지의 raw 값을 km/h 단위 속도로 변환한다.',
      status: 'open',
      priority: 'high',
      reporterId: admin.id,
      assigneeId: dev.id,
      parentId: req1.id,
      aspiceProcess: 'SWE.1',
      asilLevel: 'B',
      estimatedHours: 16,
      progressPercent: 80,
      dueDate: new Date('2026-11-20T00:00:00.000Z'),
      bodyText: 'CAN 메시지의 raw 값을 km/h 단위 속도로 변환한다.',
    },
    'requirement',
    { requirement: { reqType: 'software', asilLevel: 'B', safetyRelated: true, verificationMethod: 'unit_test', derivedFromId: req1.id } },
  );

  const req3 = await wi(
    'DEMO-3',
    {
      title: '소프트웨어 요구사항: 속도 단위를 km/h와 mph로 변환한다',
      description: '사용자 설정에 따라 km/h 또는 mph로 변환한다.',
      status: 'open',
      priority: 'medium',
      reporterId: admin.id,
      assigneeId: dev.id,
      parentId: req1.id,
      aspiceProcess: 'SWE.1',
      asilLevel: 'A',
      estimatedHours: 16,
      progressPercent: 30,
      dueDate: new Date('2026-11-25T00:00:00.000Z'),
      bodyText: '사용자 설정에 따라 km/h 또는 mph로 변환한다.',
    },
    'requirement',
    { requirement: { reqType: 'software', asilLevel: 'A', safetyRelated: false, verificationMethod: 'unit_test', derivedFromId: req1.id } },
  );

  const tc1 = await wi(
    'DEMO-4',
    {
      title: 'TC: CAN raw → km/h 변환 검증',
      description: 'raw 0x0000=0km/h, 0xFFFF=250km/h 경계값 검증',
      status: 'open',
      priority: 'high',
      reporterId: tester.id,
      assigneeId: tester.id,
      aspiceProcess: 'SWE.4',
      estimatedHours: 8,
      dueDate: new Date('2026-11-28T00:00:00.000Z'),
      bodyText: '경계값 및 일반값 변환 검증',
    },
    'test_case',
    {
      testCase: {
        testType: 'unit',
        preconditions: 'CAN 시뮬레이터 연결',
        postconditions: '변환 값이 기대값과 일치',
        steps: [
          { action: 'raw=0x0000 입력', expected: '0 km/h' },
          { action: 'raw=0x8000 입력', expected: '125 km/h' },
          { action: 'raw=0xFFFF 입력', expected: '250 km/h' },
        ],
        isAutomated: true,
        automationFramework: 'GoogleTest',
      },
    },
  );

  const tc2 = await wi(
    'DEMO-5',
    {
      title: 'TC: km/h ↔ mph 단위 변환 검증',
      description: '100 km/h → 62.137 mph 변환 검증',
      status: 'open',
      priority: 'medium',
      reporterId: tester.id,
      assigneeId: tester.id,
      aspiceProcess: 'SWE.4',
      estimatedHours: 4,
      dueDate: new Date('2026-11-30T00:00:00.000Z'),
    },
    'test_case',
    {
      testCase: {
        testType: 'unit',
        preconditions: '단위 설정 API 사용 가능',
        postconditions: '변환 계수 0.621371 적용',
        steps: [{ action: 'convert(100, "mph")', expected: '62.137' }],
        isAutomated: true,
      },
    },
  );

  await wi(
    'DEMO-6',
    {
      title: '프로젝트 계획서',
      description: 'Demo ECU 프로젝트 관리 계획',
      status: 'open',
      priority: 'medium',
      reporterId: admin.id,
      aspiceProcess: 'MAN.3',
      bodyText: '## 1. 개요\n본 문서는 Demo ECU 프로젝트의 계획을 정의한다.',
    },
    'page',
    { page: { isHomepage: true, position: 0 } },
  );

  await wi(
    'DEMO-7',
    {
      title: '위험 분석: CAN 통신 손실',
      description: 'CAN 신호 손실 시 안전 상태로 전환하는 방안 검토',
      status: 'open',
      priority: 'high',
      reporterId: admin.id,
      assigneeId: dev.id,
      aspiceProcess: 'MAN.5',
      estimatedHours: 12,
      progressPercent: 25,
      dueDate: new Date('2026-12-05T00:00:00.000Z'),
    },
    'task',
  );

  await wi(
    'DEMO-8',
    {
      title: '버그: 250 km/h 초과 시 표시 값 overflow',
      description: '경계값 초과 시 음수로 표시되는 문제',
      status: 'open',
      priority: 'critical',
      reporterId: tester.id,
      assigneeId: dev.id,
      aspiceProcess: 'SUP.9',
      estimatedHours: 4,
      dueDate: new Date('2026-11-22T00:00:00.000Z'),
    },
    'bug',
  );
  console.log('  ✓ Work items: 8');

  // ── Trace links (requirement → test_case) ────────────────
  const links = [
    [req2.id, tc1.id],
    [req3.id, tc2.id],
  ];
  for (const [fromId, toId] of links) {
    const exists = await prisma.traceLink.findFirst({
      where: { fromType: 'requirement', fromId, toType: 'test_case', toId, linkType: 'verified_by' },
    });
    if (!exists) {
      await prisma.traceLink.create({
        data: { fromType: 'requirement', fromId, toType: 'test_case', toId, linkType: 'verified_by', createdById: tester.id },
      });
      await prisma.traceLink.create({
        data: { fromType: 'test_case', fromId: toId, toType: 'requirement', toId: fromId, linkType: 'verifies', createdById: tester.id },
      });
    }
  }

  // requirement derives (req1 → req2/req3)
  for (const child of [req2.id, req3.id]) {
    const exists = await prisma.traceLink.findFirst({
      where: { fromType: 'requirement', fromId: req1.id, toType: 'requirement', toId: child, linkType: 'derives' },
    });
    if (!exists) {
      await prisma.traceLink.create({
        data: { fromType: 'requirement', fromId: req1.id, toType: 'requirement', toId: child, linkType: 'derives', createdById: admin.id },
      });
    }
  }
  console.log('  ✓ Trace links: 6');

  // ── Project deliverables ─────────────────────────────────
  const allDeliverables = await prisma.aspiceDeliverable.findMany();
  for (const d of allDeliverables) {
    const exists = await prisma.projectDeliverable.findFirst({ where: { spaceId: space.id, deliverableId: d.id } });
    if (!exists) {
      await prisma.projectDeliverable.create({
        data: { spaceId: space.id, deliverableId: d.id, status: 'not_started' },
      });
    }
  }
  console.log(`  ✓ Project deliverables: ${allDeliverables.length}`);

  console.log('\n✅ Seed 완료');
  console.log(`   관리자: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`   개발자: dev@alm.local / dev1234`);
  console.log(`   테스터: tester@alm.local / test1234`);
  console.log(`   외부감사자: auditor@external.test / audit1234`);
  console.log(`   스페이스: DEMO (${space.id})\n`);
}

main()
  .catch((e) => {
    console.error('❌ Seed 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
