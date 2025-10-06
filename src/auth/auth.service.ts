import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  constructor(
    private userRepo: UserRepository,
    private jwtService: JwtService,
  ) { }

  async register(
    nombreCompleto: string,
    email: string,
    telefono: string,
    password: string,
    role?: string,
  ) {
    const finalRole = role && role === 'ADMIN' ? 'USER' : 'USER';
    const hashed = await bcrypt.hash(password, 10);
    const user = await this.userRepo.create({
      nombreCompleto,
      email,
      telefono,
      password: hashed,
      role: finalRole,
    });
    return { id: user.id, email: user.email, role: user.role };
  }

  async getAllUsers() {
    return this.userRepo.findAll();
  }

  async login(email: string, password: string) {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException('Credenciales inválidas');

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
  async recoverPassword(email: string) {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      // No decimos "usuario no existe" para no filtrar correos
      return { message: 'Si el correo existe, se enviará un link' };
    }

    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_RESET_SECRET || 'resetsecret123',
      expiresIn: '15m',
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Recuperación de contraseña',
      text: `Haz clic en este link para restablecer tu contraseña: ${resetLink}`,
    });

    return { message: 'Si el correo existe, se enviará un link' };
  }

  // Paso 2. Validar token y resetear contraseña
  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_RESET_SECRET || 'resetsecret123',
      });

      const hashed = await bcrypt.hash(newPassword, 10);
      await this.userRepo.updatePassword(payload.sub, hashed);

      return { message: 'Contraseña actualizada correctamente' };
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }


}
