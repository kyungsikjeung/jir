import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';

@Controller('spaces/:key')
export class WorkflowsController {
  constructor(private workflowsService: WorkflowsService) {}

  @Get('workflows')
  async getWorkflows(@Param('key') key: string) {
    return this.workflowsService.getWorkflows(key);
  }

  @Post('workflows')
  async createWorkflow(@Param('key') key: string, @Body() body: any) {
    return this.workflowsService.createWorkflow(key, body, body.createdById || 'system');
  }

  @Post('workflows/:id/states')
  async createState(@Param('id') id: string, @Body() body: any) {
    return this.workflowsService.createState(id, body);
  }

  @Post('workflows/:id/transitions')
  async createTransition(@Param('id') id: string, @Body() body: any) {
    return this.workflowsService.createTransition(id, body);
  }

  @Get('reviews')
  async getReviews(@Param('key') key: string) {
    return this.workflowsService.getReviews(key);
  }

  @Post('reviews')
  async createReview(@Param('key') key: string, @Body() body: any) {
    return this.workflowsService.createReview(key, body, body.createdById || 'system');
  }

  @Get('reviews/:id')
  async getReview(@Param('id') id: string) {
    return this.workflowsService.getReview(id);
  }

  @Patch('reviews/:id')
  async updateReview(@Param('id') id: string, @Body() body: any) {
    return this.workflowsService.updateReview(id, body);
  }

  @Post('reviews/:id/findings')
  async createFinding(@Param('id') id: string, @Body() body: any) {
    return this.workflowsService.createFinding(id, body, body.createdById || 'system');
  }

  @Post('approvals')
  async createApproval(@Body() body: any) {
    return this.workflowsService.createApproval(body, body.approverId || 'system');
  }
}
