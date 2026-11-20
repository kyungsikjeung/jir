import { Test } from '@nestjs/testing';
import { SignaturesModule } from './signatures.module';
import { SignaturesService } from './signatures.service';

describe('SignaturesModule (DI)', () => {
  it('PrismaService 주입으로 컴파일된다', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SignaturesModule],
    }).compile();

    expect(moduleRef.get(SignaturesService)).toBeDefined();
    await moduleRef.close();
  });
});
