import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service';

@Controller('export')
export class ExportController {
  constructor(private exportService: ExportService) {}

  @Get('documents/:id/pdf')
  async exportPdf(@Param('id') id: string, @Res() res: Response) {
    const pdf = await this.exportService.exportDocumentToPdf(id);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="document.pdf"` });
    res.send(pdf);
  }

  @Get('spaces/:key/traceability/excel')
  async exportTraceability(@Param('key') key: string, @Res() res: Response) {
    const excel = await this.exportService.exportTraceabilityToExcel(key);
    res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="traceability.xlsx"` });
    res.send(excel);
  }
}
