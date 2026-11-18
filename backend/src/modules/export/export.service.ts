import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import * as ExcelJS from 'exceljs';
import puppeteer from 'puppeteer';

type TipTapNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, any>;
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
  content?: TipTapNode[];
};

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  // ══════════════════════════════════════════════════════════
  // 공통: 문서 로드
  // ══════════════════════════════════════════════════════════
  private async loadDocument(documentId: string) {
    const doc = await this.prisma.workItem.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException(`Document not found: ${documentId}`);

    const space = await this.prisma.space.findUnique({ where: { id: doc.spaceId } });
    const [creator, approver, versions] = await Promise.all([
      doc.reporterId
        ? this.prisma.user.findUnique({
            where: { id: doc.reporterId },
            select: { displayName: true, email: true },
          })
        : Promise.resolve(null),
      doc.assigneeId
        ? this.prisma.user.findUnique({
            where: { id: doc.assigneeId },
            select: { displayName: true, email: true },
          })
        : Promise.resolve(null),
      this.prisma.workItemVersion.findMany({
        where: { workItemId: documentId },
        orderBy: { version: 'desc' },
      }),
    ]);

    return { doc, space, creator, approver, versions };
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** TipTap JSON → HTML (export 용, 서버 렌더링) */
  private renderTipTapHtml(node: TipTapNode | null | undefined, doc?: any): string {
    if (!node) {
      const text = doc?.bodyText || doc?.description || '';
      return text
        .split(/\n{2,}/)
        .map((p: string) => `<p>${this.escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
        .join('\n');
    }
    if (node.text !== undefined) {
      let html = this.escapeHtml(node.text);
      for (const mark of node.marks || []) {
        switch (mark.type) {
          case 'bold':
            html = `<strong>${html}</strong>`;
            break;
          case 'italic':
            html = `<em>${html}</em>`;
            break;
          case 'strike':
            html = `<s>${html}</s>`;
            break;
          case 'code':
            html = `<code>${html}</code>`;
            break;
          case 'link':
            html = `<a href="${this.escapeHtml(mark.attrs?.href || '#')}">${html}</a>`;
            break;
        }
      }
      return html;
    }

    const inner = (node.content || []).map((c) => this.renderTipTapHtml(c)).join('');

    switch (node.type) {
      case 'doc':
        return inner;
      case 'paragraph':
        return `<p>${inner || '<br/>'}</p>`;
      case 'heading': {
        const level = Math.min(Number(node.attrs?.level) || 1, 6);
        return `<h${level}>${inner}</h${level}>`;
      }
      case 'bulletList':
        return `<ul>${inner}</ul>`;
      case 'orderedList':
        return `<ol>${inner}</ol>`;
      case 'listItem':
        return `<li>${inner}</li>`;
      case 'blockquote':
        return `<blockquote>${inner}</blockquote>`;
      case 'codeBlock': {
        const lang = node.attrs?.language ? ` class="language-${this.escapeHtml(node.attrs.language)}"` : '';
        return `<pre><code${lang}>${inner}</code></pre>`;
      }
      case 'horizontalRule':
        return '<hr/>';
      case 'hardBreak':
        return '<br/>';
      case 'table':
        return `<table>${inner}</table>`;
      case 'tableRow':
        return `<tr>${inner}</tr>`;
      case 'tableHeader':
        return `<th>${inner}</th>`;
      case 'tableCell':
        return `<td>${inner}</td>`;
      default:
        return inner;
    }
  }

  private buildHtmlDocument(data: Awaited<ReturnType<ExportService['loadDocument']>>): string {
    const { doc, space, creator, versions } = data;
    const bodyHtml = doc.body
      ? this.renderTipTapHtml(doc.body as TipTapNode, doc)
      : this.renderTipTapHtml(null, doc);

    return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>${this.escapeHtml(doc.title)}</title>
<style>
  @page { size: A4; margin: 20mm 18mm; }
  body { font-family: 'Malgun Gothic', 'Segoe UI', Arial, sans-serif; color:#1f2937; line-height:1.7; font-size:11pt; }
  h1 { font-size:20pt; margin:0 0 6pt; }
  h2 { font-size:15pt; margin:16pt 0 6pt; border-bottom:1px solid #e5e7eb; padding-bottom:3pt; }
  h3 { font-size:12.5pt; margin:12pt 0 4pt; }
  p { margin:5pt 0; }
  ul,ol { margin:5pt 0 5pt 18pt; }
  table { border-collapse:collapse; width:100%; margin:8pt 0; font-size:9.5pt; }
  th,td { border:1px solid #d1d5db; padding:4pt 6pt; text-align:left; vertical-align:top; }
  th { background:#f3f4f6; }
  pre { background:#0f172a; color:#e2e8f0; padding:8pt; border-radius:4pt; font-size:8.5pt; overflow-x:auto; }
  code { font-family: Consolas, monospace; }
  blockquote { border-left:3px solid #93c5fd; background:#eff6ff; margin:8pt 0; padding:4pt 10pt; color:#1e3a8a; }
  hr { border:0; border-top:1px solid #e5e7eb; margin:12pt 0; }
  .meta { border:1px solid #e5e7eb; border-radius:6px; padding:10pt 12pt; margin:12pt 0 18pt; font-size:9.5pt; }
  .meta table { margin:0; border:0; }
  .meta th { width:110pt; background:#f9fafb; border:0; border-bottom:1px solid #f1f5f9; }
  .meta td { border:0; border-bottom:1px solid #f1f5f9; }
  .footer-note { margin-top:24pt; border-top:1px solid #e5e7eb; padding-top:6pt; font-size:8pt; color:#6b7280; }
  .mermaid-note { font-size:8.5pt; color:#6b7280; }
</style>
</head>
<body>
  <h1>${this.escapeHtml(doc.title)}</h1>
  <div class="meta">
    <table>
      <tr><th>문서 키</th><td>${this.escapeHtml(doc.key)}</td><th>버전</th><td>v${doc.version}</td></tr>
      <tr><th>프로젝트</th><td colspan="3">${this.escapeHtml(space?.name || '')} (${this.escapeHtml(space?.key || '')})</td></tr>
      <tr><th>ASPICE 프로세스</th><td>${this.escapeHtml(doc.aspiceProcess || '—')}</td><th>상태</th><td>${this.escapeHtml(doc.status || '')}</td></tr>
      <tr><th>작성자</th><td>${this.escapeHtml(creator?.displayName || creator?.email || '—')}</td><th>최종 수정</th><td>${new Date(doc.updatedAt).toISOString().slice(0, 10)}</td></tr>
      <tr><th>문서 ID</th><td colspan="3">${this.escapeHtml(doc.id)}</td></tr>
    </table>
  </div>
  <div class="content">
${bodyHtml}
  </div>
  <div class="footer-note">
    Generated by jir ALM · ${new Date().toISOString()} · version history: ${versions.length} revision(s)
  </div>
</body>
</html>`;
  }

  // ══════════════════════════════════════════════════════════
  // PDF (Puppeteer)
  // ══════════════════════════════════════════════════════════
  async exportDocumentToPdf(documentId: string): Promise<Buffer> {
    const data = await this.loadDocument(documentId);
    const html = this.buildHtmlDocument(data);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '18mm', bottom: '16mm', left: '15mm', right: '15mm' },
        displayHeaderFooter: true,
        headerTemplate: `<div style="font-size:8px;color:#9ca3af;width:100%;padding:0 15mm;text-align:right;">${this.escapeHtml(data.doc.key)} · v${data.doc.version}</div>`,
        footerTemplate:
          '<div style="font-size:8px;color:#9ca3af;width:100%;padding:0 15mm;display:flex;justify-content:space-between;"><span>jir ALM</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  // ══════════════════════════════════════════════════════════
  // HTML
  // ══════════════════════════════════════════════════════════
  async exportDocumentToHtml(documentId: string): Promise<string> {
    const data = await this.loadDocument(documentId);
    return this.buildHtmlDocument(data);
  }

  // ══════════════════════════════════════════════════════════
  // Word (.docx)
  // ══════════════════════════════════════════════════════════
  private docxRuns(node: TipTapNode): TextRun[] {
    if (node.text !== undefined) {
      const marks = new Set((node.marks || []).map((m) => m.type));
      return [
        new TextRun({
          text: node.text,
          bold: marks.has('bold'),
          italics: marks.has('italic'),
          strike: marks.has('strike'),
          font: marks.has('code') ? 'Consolas' : undefined,
        }),
      ];
    }
    return (node.content || []).flatMap((c) => this.docxRuns(c));
  }

  private docxParagraphs(node: TipTapNode, listDepth = 0, ordered = false): Paragraph[] {
    const out: Paragraph[] = [];
    switch (node.type) {
      case 'doc':
        for (const child of node.content || []) out.push(...this.docxParagraphs(child, listDepth, ordered));
        break;
      case 'heading': {
        const level = Number(node.attrs?.level) || 1;
        const headingMap: Record<number, any> = {
          1: HeadingLevel.HEADING_1,
          2: HeadingLevel.HEADING_2,
          3: HeadingLevel.HEADING_3,
          4: HeadingLevel.HEADING_4,
        };
        out.push(
          new Paragraph({
            heading: headingMap[level] || HeadingLevel.HEADING_3,
            children: this.docxRuns(node),
            spacing: { before: 200, after: 100 },
          }),
        );
        break;
      }
      case 'paragraph':
        out.push(new Paragraph({ children: this.docxRuns(node), spacing: { after: 100 } }));
        break;
      case 'bulletList':
      case 'orderedList': {
        const isOrdered = node.type === 'orderedList';
        for (const item of node.content || []) {
          out.push(...this.docxParagraphs(item, listDepth + 1, isOrdered));
        }
        break;
      }
      case 'listItem': {
        const paragraphs = (node.content || []).flatMap((c) => this.docxParagraphs(c, listDepth, ordered));
        if (paragraphs.length === 0) {
          out.push(new Paragraph({ text: '', bullet: { level: Math.min(listDepth, 8) } }));
        } else {
          paragraphs[0] = new Paragraph({
            children: this.docxRuns(node),
            bullet: { level: Math.min(Math.max(listDepth - 1, 0), 8) },
            spacing: { after: 60 },
          });
          out.push(...paragraphs);
        }
        break;
      }
      case 'blockquote':
        for (const child of node.content || []) {
          out.push(
            new Paragraph({
              children: this.docxRuns(child),
              indent: { left: 480 },
              border: { left: { style: 'single', size: 12, color: '93C5FD', space: 8 } },
              spacing: { after: 100 },
            }),
          );
        }
        break;
      case 'codeBlock': {
        const text = (node.content || []).map((c) => c.text || '').join('');
        for (const line of text.split('\n')) {
          out.push(
            new Paragraph({
              children: [new TextRun({ text: line, font: 'Consolas', size: 18 })],
              shading: { fill: 'F1F5F9' },
              spacing: { after: 0 },
            }),
          );
        }
        out.push(new Paragraph({ text: '', spacing: { after: 100 } }));
        break;
      }
      case 'horizontalRule':
        out.push(new Paragraph({ text: '', border: { bottom: { style: 'single', size: 6, color: 'D1D5DB' } } }));
        break;
      case 'table': {
        for (const row of node.content || []) {
          const cells = (row.content || []).map((cell) =>
            (cell.content || []).flatMap((c) => this.docxRuns(c)).map((r) => r),
          );
          out.push(
            new Paragraph({
              children: cells.flatMap((runs, idx) =>
                idx === 0
                  ? runs
                  : [new TextRun({ text: ' | ' }), ...runs],
              ),
              spacing: { after: 40 },
            }),
          );
        }
        out.push(new Paragraph({ text: '', spacing: { after: 100 } }));
        break;
      }
      default:
        if (node.content) {
          for (const child of node.content) out.push(...this.docxParagraphs(child, listDepth, ordered));
        } else if (node.text) {
          out.push(new Paragraph({ children: this.docxRuns(node) }));
        }
    }
    return out;
  }

  async exportDocumentToDocx(documentId: string): Promise<Buffer> {
    const data = await this.loadDocument(documentId);
    const { doc, space, creator } = data;

    const metaRows: Array<[string, string]> = [
      ['문서 키', doc.key],
      ['버전', `v${doc.version}`],
      ['프로젝트', `${space?.name || ''} (${space?.key || ''})`],
      ['ASPICE 프로세스', doc.aspiceProcess || '—'],
      ['상태', doc.status || ''],
      ['작성자', creator?.displayName || creator?.email || '—'],
    ];

    const children: Paragraph[] = [
      new Paragraph({
        heading: HeadingLevel.TITLE,
        children: [new TextRun({ text: doc.title, bold: true, size: 40 })],
        spacing: { after: 240 },
      }),
      ...metaRows.map(
        ([label, value]) =>
          new Paragraph({
            children: [
              new TextRun({ text: `${label}: `, bold: true, size: 18, color: '6B7280' }),
              new TextRun({ text: value, size: 18 }),
            ],
            spacing: { after: 40 },
          }),
      ),
      new Paragraph({
        children: [new TextRun({ text: '' })],
        border: { bottom: { style: 'single', size: 6, color: 'D1D5DB' } },
        spacing: { before: 120, after: 240 },
      }),
    ];

    if (doc.body) {
      children.push(...this.docxParagraphs(doc.body as TipTapNode));
    } else {
      const text = doc.bodyText || doc.description || '';
      for (const para of text.split(/\n{2,}/)) {
        children.push(new Paragraph({ children: [new TextRun(para)], spacing: { after: 120 } }));
      }
    }

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Generated by jir ALM · ${new Date().toISOString()} · ${doc.id}`,
            size: 14,
            color: '9CA3AF',
          }),
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { before: 400 },
      }),
    );

    const document = new Document({
      creator: 'jir ALM',
      title: doc.title,
      description: `${doc.key} v${doc.version}`,
      sections: [{ properties: {}, children }],
    });

    return Packer.toBuffer(document);
  }

  // ══════════════════════════════════════════════════════════
  // Excel: 추적성 매트릭스
  // ══════════════════════════════════════════════════════════
  async exportTraceabilityToExcel(spaceKey: string): Promise<Buffer> {
    const space = await this.prisma.space.findUnique({ where: { key: spaceKey } });
    if (!space) throw new NotFoundException(`Space not found: ${spaceKey}`);

    const typeIds = await this.prisma.workItemType.findMany({
      where: { spaceId: space.id, name: { in: ['requirement', 'test_case'] } },
    });
    const reqTypeId = typeIds.find((t) => t.name === 'requirement')?.id;
    const testTypeId = typeIds.find((t) => t.name === 'test_case')?.id;

    const [requirements, tests, items] = await Promise.all([
      reqTypeId
        ? this.prisma.workItem.findMany({
            where: { spaceId: space.id, typeId: reqTypeId },
            orderBy: { key: 'asc' },
          })
        : Promise.resolve([] as any[]),
      testTypeId
        ? this.prisma.workItem.findMany({
            where: { spaceId: space.id, typeId: testTypeId },
            orderBy: { key: 'asc' },
          })
        : Promise.resolve([] as any[]),
      this.prisma.workItem.findMany({ where: { spaceId: space.id }, select: { id: true } }),
    ]);

    const ids = new Set(items.map((i) => i.id));
    const allLinks = await this.prisma.traceLink.findMany();
    const links = allLinks.filter((l) => ids.has(l.fromId) && ids.has(l.toId));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'jir ALM';
    workbook.created = new Date();

    // ── Sheet 1: 추적성 매트릭스 ────────────────────────────
    const ws = workbook.addWorksheet('Traceability Matrix');
    ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
    ws.columns = [
      { header: 'Requirement', key: 'req', width: 14 },
      { header: 'Title', key: 'title', width: 52 },
      { header: 'ASIL', key: 'asil', width: 8 },
      { header: 'ASPICE', key: 'aspice', width: 10 },
      { header: 'Covered', key: 'covered', width: 10 },
      ...tests.map((t) => ({ header: t.key, key: t.id, width: 12 })),
    ];
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };

    for (const req of requirements) {
      const row: any = {
        req: req.key,
        title: req.title,
        asil: req.asilLevel || '—',
        aspice: req.aspiceProcess || '—',
        covered: links.some((l) => l.fromId === req.id) ? 'Y' : 'N',
      };
      for (const t of tests) {
        row[t.id] = links.some((l) => l.fromId === req.id && l.toId === t.id) ? '✓' : '';
      }
      ws.addRow(row);
    }
    ws.eachRow((row, index) => {
      if (index === 1) return;
      const covered = row.getCell('covered').value === 'Y';
      if (!covered) row.getCell('covered').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    });

    // ── Sheet 2: 링크 상세 ─────────────────────────────────
    const wsLinks = workbook.addWorksheet('Links');
    wsLinks.columns = [
      { header: 'From Type', key: 'fromType', width: 16 },
      { header: 'From Key', key: 'fromKey', width: 14 },
      { header: 'Link Type', key: 'linkType', width: 18 },
      { header: 'To Type', key: 'toType', width: 16 },
      { header: 'To Key', key: 'toKey', width: 14 },
      { header: 'Suspect', key: 'suspect', width: 10 },
      { header: 'Created At', key: 'createdAt', width: 20 },
    ];
    wsLinks.getRow(1).font = { bold: true };
    const allItems = await this.prisma.workItem.findMany({
      where: { spaceId: space.id },
      select: { id: true, key: true },
    });
    const kById = new Map(allItems.map((i) => [i.id, i.key]));
    for (const l of links) {
      wsLinks.addRow({
        fromType: l.fromType,
        fromKey: kById.get(l.fromId) || l.fromId.slice(0, 8),
        linkType: l.linkType,
        toType: l.toType,
        toKey: kById.get(l.toId) || l.toId.slice(0, 8),
        suspect: l.isSuspect ? 'SUSPECT' : '',
        createdAt: l.createdAt.toISOString().slice(0, 19).replace('T', ' '),
      });
    }

    // ── Sheet 3: 요약 ──────────────────────────────────────
    const coveredReqs = requirements.filter((r) => links.some((l) => l.fromId === r.id));
    const wsSummary = workbook.addWorksheet('Summary');
    wsSummary.columns = [
      { header: 'Item', key: 'item', width: 32 },
      { header: 'Value', key: 'value', width: 24 },
    ];
    wsSummary.addRows([
      { item: 'Project', value: `${space.name} (${space.key})` },
      { item: 'ASPICE Level', value: space.aspiceLevel || '—' },
      { item: 'Requirements', value: requirements.length },
      { item: 'Test Cases', value: tests.length },
      { item: 'Trace Links', value: links.length },
      { item: 'Suspect Links', value: links.filter((l) => l.isSuspect).length },
      {
        item: 'Coverage %',
        value: requirements.length
          ? `${((coveredReqs.length / requirements.length) * 100).toFixed(2)} %`
          : '0 %',
      },
      { item: 'Uncovered Requirements', value: requirements.filter((r) => !coveredReqs.includes(r)).map((r) => r.key).join(', ') || '—' },
      { item: 'Exported At', value: new Date().toISOString() },
    ]);
    wsSummary.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ══════════════════════════════════════════════════════════
  // Excel: ASPICE 컴플라이언스 현황
  // ══════════════════════════════════════════════════════════
  async exportComplianceToExcel(spaceKey: string): Promise<Buffer> {
    const space = await this.prisma.space.findUnique({ where: { key: spaceKey } });
    if (!space) throw new NotFoundException(`Space not found: ${spaceKey}`);

    const [processes, areas, checklists, deliverables, catalog] = await Promise.all([
      this.prisma.spaceProcessArea.findMany({ where: { spaceId: space.id, isApplicable: true } }),
      this.prisma.processArea.findMany(),
      this.prisma.complianceChecklist.findMany({ where: { spaceId: space.id } }),
      this.prisma.projectDeliverable.findMany({ where: { spaceId: space.id } }),
      this.prisma.aspiceDeliverable.findMany(),
    ]);
    const areaByCode = new Map(areas.map((a) => [a.code, a]));

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('ASPICE Compliance');
    ws.columns = [
      { header: 'Process', key: 'code', width: 10 },
      { header: 'Name', key: 'name', width: 46 },
      { header: 'Level', key: 'level', width: 8 },
      { header: 'Checklist', key: 'total', width: 11 },
      { header: 'Completed', key: 'done', width: 11 },
      { header: 'Progress %', key: 'pct', width: 12 },
      { header: 'Deliverables', key: 'deliv', width: 13 },
      { header: 'Released', key: 'released', width: 11 },
    ];
    ws.getRow(1).font = { bold: true };

    for (const sp of processes.sort((a, b) => a.processCode.localeCompare(b.processCode))) {
      const items = checklists.filter((c) => c.processCode === sp.processCode);
      const done = items.filter((c) => c.status === 'completed').length;
      const catalogIds = new Set(catalog.filter((c) => c.processCode === sp.processCode).map((c) => c.id));
      const procDeliverables = deliverables.filter((d) => catalogIds.has(d.deliverableId));
      ws.addRow({
        code: sp.processCode,
        name: areaByCode.get(sp.processCode)?.name || '',
        level: areaByCode.get(sp.processCode)?.level || '',
        total: items.length,
        done,
        pct: items.length ? +((done / items.length) * 100).toFixed(1) : 0,
        deliv: procDeliverables.length,
        released: procDeliverables.filter((d) => d.status === 'released').length,
      });
    }

    const wsCheck = workbook.addWorksheet('Checklist');
    wsCheck.columns = [
      { header: 'Process', key: 'processCode', width: 10 },
      { header: 'Item', key: 'itemName', width: 44 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Completed At', key: 'completedAt', width: 20 },
    ];
    wsCheck.getRow(1).font = { bold: true };
    for (const c of checklists) {
      wsCheck.addRow({
        processCode: c.processCode,
        itemName: c.itemName,
        status: c.status,
        completedAt: c.completedAt ? c.completedAt.toISOString().slice(0, 19).replace('T', ' ') : '',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
