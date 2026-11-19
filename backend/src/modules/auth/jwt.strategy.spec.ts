import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

function createPrismaMock() {
  return {
    user: { findUnique: jest.fn() },
  };
}

describe('JwtStrategy', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let strategy: JwtStrategy;

  beforeEach(() => {
    prisma = createPrismaMock();
    strategy = new JwtStrategy(prisma as any);
  });

  it('활성 + 승인된 사용자는 payload 를 반환한다', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'admin@alm.local',
      isActive: true,
      isApproved: true,
      isInternal: true,
      isVerified: true,
    });

    const result = await strategy.validate({ sub: 'u1', email: 'admin@alm.local' });

    expect(result).toEqual({
      id: 'u1',
      email: 'admin@alm.local',
      isInternal: true,
      isVerified: true,
      isApproved: true,
    });
  });

  it('사용자가 없으면 UnauthorizedException 을 던진다', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(strategy.validate({ sub: 'u1' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('비활성 사용자는 UnauthorizedException 을 던진다', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'admin@alm.local',
      isActive: false,
      isApproved: true,
      isInternal: true,
      isVerified: true,
    });

    await expect(strategy.validate({ sub: 'u1' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('미승인 외부 사용자는 UnauthorizedException 을 던진다', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'external@alm.local',
      isActive: true,
      isApproved: false,
      isInternal: false,
      isVerified: true,
    });

    await expect(strategy.validate({ sub: 'u1' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
