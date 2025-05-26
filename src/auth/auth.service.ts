import { Injectable, UnauthorizedException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/auth.dto'; // Import LoginDto

@Injectable()
export class AuthService {
  private prisma = new PrismaClient();

  constructor(private readonly jwtService: JwtService) {}

  async validateUser(username: string, passwordString: string): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) {
      throw new NotFoundException(`User with username ${username} not found.`);
    }
    const isPasswordValid = await bcrypt.compare(passwordString, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password.');
    }
    // Remove password before returning
    const { password, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) { 
    let userValidated: Omit<User, 'password'>;
    try {
      userValidated = await this.validateUser(loginDto.username, loginDto.password);
    } catch (error) {
      if (error instanceof NotFoundException || 
          (error instanceof UnauthorizedException && error.message === 'Invalid password.')) {
        throw new UnauthorizedException('Invalid credentials. Please check your username and password.');
      }
      console.error('Unexpected error during user validation:', error);
      throw new InternalServerErrorException('An unexpected error occurred during login.');
    }

    const payload = { sub: userValidated.id, username: userValidated.username, role: userValidated.role };
    let accessToken: string;
    try {
      accessToken = this.jwtService.sign(payload);
    } catch (error) {
      console.error('JWT signing failed:', error);
      throw new InternalServerErrorException('Could not process login due to an internal issue. Please try again later.');
    }

    return {
      http_code: 200,
      message: 'Login successful',
      data: {
        access_token: accessToken,
        user: userValidated,
      },
    };
  }
}
