import { Injectable, UnauthorizedException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User, status } from '@prisma/client'; // Changed Status to status
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/auth.dto';
import { PrismaService } from '../prisma/prisma.service'; // Import PrismaService

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService, // Inject PrismaService
  ) {}

  async validateUser(username: string, passwordString: string): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) {
      throw new NotFoundException(`User with username ${username} not found.`);
    }
    const isPasswordValid = await bcrypt.compare(passwordString, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password.');
    }
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

    let updatedUserWithStatus: User;
    try {
      const userWithPassword = await this.prisma.user.update({
        where: { id: userValidated.id },
        data: { status: status.ACTIVE }, // Use status.ACTIVE
      });
      const { password, ...result } = userWithPassword;
      updatedUserWithStatus = result as User;
    } catch (error) {
      console.error('Failed to update user status to ACTIVE:', error);
      // If status update fails, proceed with the userValidated data which might have the old status
      // and explicitly cast to User type, ensuring all expected fields are present or handled.
      updatedUserWithStatus = userValidated as User;
      // Ensure status field is at least null if not present, to match User type expectations.
      if (updatedUserWithStatus.status === undefined) {
        updatedUserWithStatus.status = null;
      }
    }

    const payload = { 
      sub: updatedUserWithStatus.id, 
      username: updatedUserWithStatus.username, 
      role: updatedUserWithStatus.role, 
      status: updatedUserWithStatus.status
    };
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
        user: updatedUserWithStatus,
      },
    };
  }
}
