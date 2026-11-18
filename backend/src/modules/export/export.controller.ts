import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service';

@Controller('export')
export class ExportController {
  constructor(private exportService: ExportService) {}

  // ── 문서 내보내기 ─────────────────────────────────────────
  @Get('documents/:id/pdf')
  async exportPdf(@Param('id') id: string, @Res() res: Response) {
    const pdf = await this.exportService.exportDocumentToPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="document-${id.slice(0, 8)}.pdf"`,
      'Content-Length': String(pdf.length),
    });
    res.send(pdf);
  }

  @Get('documents/:id/docx')
  async exportDocx(@Param('id') id: string, @Res() res: Response) {
    const docx = await this.exportService.exportDocumentToDocx(id);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="document-${id.slice(0, 8)}.docx"`,
      'Content-Length': String(docx.length),
    });
    res.send(docx);
  }

  @Get('documents/:id/html')
  async exportHtml(@Param('id') id: string, @Res() res: Response) {
    const html = await this.exportService.exportDocumentToHtml(id);
    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="document-${id.slice(0, 8)}.html"`,
    });
    res.send(html);
  }

  // ── 추적성 매트릭스 (Excel) ───────────────────────────────
  @Get('spaces/:key/traceability/excel')
  async exportTraceability(@Param('key') key: string, @Res() res: Response) {
    const excel = await this.exportService.exportTraceabilityToExcel(key);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${key}-traceability.xlsx"`,
      'Content-Length': String(excel.length),
    });
    res.send(excel);
  }

  // ── ASPICE 컴플라이언스 (Excel) ───────────────────────────
  @Get('spaces/:key/compliance/excel')
  async exportCompliance(@Param('key') key: string, @Res() res: Response) {
    const excel = await this.exportService.exportComplianceToExcel(key);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${key}-compliance.xlsx"`,
      'Content-Length': String(excel.length),
    });
    res.send(excel);
  }
}
