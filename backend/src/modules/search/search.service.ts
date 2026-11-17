import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MeiliSearch } from 'meilisearch';

@Injectable()
export class SearchService {
  private client = new MeiliSearch({
    host: process.env.MEILI_HOST || 'http://meilisearch:7700',
    apiKey: process.env.MEILI_API_KEY || 'dev-master-key',
  });

  constructor(private prisma: PrismaService) {}

  async search(query: string, filters?: string, limit = 50) {
    const index = this.client.index('work_items');
    return index.search(query, { filter: filters, limit, attributesToHighlight: ['title', 'bodyText'] });
  }

  async suggest(prefix: string) {
    const result = await this.client.index('work_items').search(prefix, { limit: 5 });
    return result.hits.map(h => h.title);
  }

  async indexDocument(id: string, document: any) {
    await this.client.index('work_items').addDocuments([{ id, ...document }]);
  }

  async deleteDocument(id: string) {
    await this.client.index('work_items').deleteDocument(id);
  }
}
