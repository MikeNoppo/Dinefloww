import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaClient, User, Role as PrismaRole } from '@prisma/client';
import { Logger } from '@nestjs/common';

interface JwtPayload {
  sub: string; 
  email: string; 
  role: PrismaRole;
}  

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private prisma = new PrismaClient();
  private logger = new Logger(JwtStrategy.name);

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default_jwt_secret',
    });
  }

  async validate(payload: JwtPayload): Promise<Omit<User, 'password'>> {
    if (!payload || !payload.sub || !payload.email) {
      this.logger.warn('JWT validation failed: payload is invalid or missing required fields.');
      throw new UnauthorizedException('Invalid token: payload malformed.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      this.logger.warn(
        `JWT validation failed: User with email ${payload.email} (ID: ${payload.sub}) not found.`,
      );
      throw new UnauthorizedException('Invalid token or user not found.');
    }

    const { password, ...result } = user; 
    return result; 
  }
}
