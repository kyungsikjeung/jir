import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get()
  async search(@Query('q') q: string, @Query('filter') filter?: string, @Query('limit') limit?: number) {
    return this.searchService.search(q, filter, limit);
  }

  @Get('suggest')
  async suggest(@Query('q') q: string) {
    return this.searchService.suggest(q);
  }
}
