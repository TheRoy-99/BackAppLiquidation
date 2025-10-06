import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RecoverDto } from './dto/recover.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(
      dto.nombreCompleto,
      dto.email,
      dto.telefono,
      dto.password,
    );
  }
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard)
  async getUsers() {
    return this.authService.getAllUsers();
  }

  @Post('recover')
  async recover(@Body() dto: RecoverDto) {
    return this.authService.recoverPassword(dto.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

}
