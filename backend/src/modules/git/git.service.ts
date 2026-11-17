import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GitService {
  constructor(private prisma: PrismaService) {}

  async handleWebhook(payload: any) {
    // Smart commit parsing
    const message = payload.commits?.[0]?.message || '';
    const issueKeyMatch = message.match(/([A-Z]+-\d+)/);
    if (issueKeyMatch) {
      const issueKey = issueKeyMatch[1];
      if (message.includes('#done')) {
        // Transition to done
      }
      if (message.includes('#comment')) {
        const commentMatch = message.match(/#comment\s+(.+)/);
        if (commentMatch) {
          // Add comment
        }
      }
    }
    return { received: true };
  }

  async getConnections() {
    return [];
  }

  async createConnection(data: any) {
    return data;
  }
}
