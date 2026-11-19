import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret',
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('사용자를 찾을 수 없거나 비활성 상태입니다.');
    }

    if (!user.isApproved) {
      throw new UnauthorizedException(
        '관리자 승인이 필요한 계정입니다.',
      );
    }

    return {
      id: user.id,
      email: user.email,
      isInternal: user.isInternal,
      isVerified: user.isVerified,
      isApproved: user.isApproved,
    };
  }
}
