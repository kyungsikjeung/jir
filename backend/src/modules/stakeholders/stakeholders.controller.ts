import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { StakeholdersService } from './stakeholders.service';

@Controller()
export class StakeholdersController {
  constructor(private stakeholdersService: StakeholdersService) {}

  @Get('admin/stakeholders/types')
  async getTypes() {
    return this.stakeholdersService.getTypes();
  }

  @Get('admin/stakeholders/organizations')
  async getOrganizations(@Query() query: any) {
    return this.stakeholdersService.getOrganizations(query.orgId);
  }

  @Post('admin/stakeholders/invitations')
  async invite(@Body() body: any) {
    return this.stakeholdersService.invite(body, body.invitedBy || 'system');
  }

  @Get('portal/:spaceKey')
  async getPortalDashboard(@Param('spaceKey') spaceKey: string) {
    return this.stakeholdersService.getPortalDashboard(spaceKey, 'system');
  }
}
