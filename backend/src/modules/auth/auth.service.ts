import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

// 비밀번호 해싱 (bcryptjs — 순수 JS, 네이티브 빌드 불필요)
function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

function comparePassword(password: string, hash: string): boolean {
  if (!hash) return false;
  // bcrypt 해시 ($2a$/$2b$/$2y$)
  if (hash.startsWith('$2')) return bcrypt.compareSync(password, hash);
  // 레거시 개발용 base64 해시 (마이그레이션 호환)
  return Buffer.from(password).toString('base64') === hash;
}

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return null;
    const valid = comparePassword(password, user.passwordHash);
    if (!valid) return null;
    if (!user.isVerified) throw new UnauthorizedException('Email not verified');
    if (!user.isApproved) throw new UnauthorizedException('Approval pending');
    if (!user.isActive) throw new UnauthorizedException('Account deactivated');
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, email: user.email, roles: [] };
    const accessToken = this.jwt.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwt.sign(payload, { expiresIn: '7d' });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return { accessToken, refreshToken, user: { id: user.id, email: user.email, displayName: user.displayName } };
  }

  async register(email: string, password: string, displayName: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new UnauthorizedException('Email already registered');

    const isInternal = email.endsWith(`@${process.env.INTERNAL_EMAIL_DOMAIN || 'tovis.com'}`);
    const passwordHash = hashPassword(password);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        isInternal,
        isVerified: isInternal,
        isApproved: isInternal,
        orgId: 'default-org',
      },
    });

    return { message: isInternal ? 'Registration complete' : 'Registration pending approval', userId: user.id };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwt.verify(token);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.isActive) throw new UnauthorizedException();
      const newPayload = { sub: user.id, email: user.email, roles: [] };
      return { accessToken: this.jwt.sign(newPayload, { expiresIn: '15m' }) };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
