import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { FieldDefinitionService } from './field-definition.service';

@Controller('field-definitions')
export class FieldDefinitionController {
  constructor(private service: FieldDefinitionService) {}

  @Post()
  async create(@Body() body: any) {
    return this.service.create(body);
  }

  @Get()
  async findAll(
    @Query('spaceId') spaceId?: string,
    @Query('typeId') typeId?: string,
  ) {
    return this.service.findAll(spaceId, typeId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  async softDelete(@Param('id') id: string) {
    return this.service.softDelete(id);
  }
}
