import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

describe('AppModule (DI)', () => {
  it('전체 모듈 그래프가 컴파일된다', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  });
});
