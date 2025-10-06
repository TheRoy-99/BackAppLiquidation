import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { User, Role } from '@prisma/client';

// Tipo seguro que no expone la contraseña
export type UserSafe = {
  id: number;
  nombreCompleto: string;
  email: string;
  telefono: string;
  role: Role;
  createdAt: Date;
};

@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) {}

  // Crear usuario (devuelve UserSafe)
  async create(data: {
    nombreCompleto: string;
    email: string;
    telefono: string;
    password: string;
    role?: Role;
  }): Promise<UserSafe> {
    return this.prisma.user
      .create({
        data: {
          nombreCompleto: data.nombreCompleto,
          email: data.email,
          telefono: data.telefono,
          password: data.password,
          role: data.role ?? 'USER',
        },
        select: {
          id: true,
          nombreCompleto: true,
          email: true,
          telefono: true,
          role: true,
          createdAt: true,
        },
      }) as Promise<UserSafe>;
  }

  // Buscar usuario por email (incluye password para login)
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  // Actualizar contraseña (devuelve UserSafe)
  async updatePassword(id: number, newPassword: string): Promise<UserSafe> {
    return this.prisma.user
      .update({
        where: { id },
        data: { password: newPassword },
        select: {
          id: true,
          nombreCompleto: true,
          email: true,
          telefono: true,
          role: true,
          createdAt: true,
        },
      }) as Promise<UserSafe>;
  }

  // Listar todos los usuarios (sin password)
  async findAll(): Promise<UserSafe[]> {
    return this.prisma.user
      .findMany({
        select: {
          id: true,
          nombreCompleto: true,
          email: true,
          telefono: true,
          role: true,
          createdAt: true,
        },
      }) as Promise<UserSafe[]>;
  }

  // Buscar usuario por ID (sin password)
  async findById(id: number): Promise<UserSafe | null> {
    return this.prisma.user
      .findUnique({
        where: { id },
        select: {
          id: true,
          nombreCompleto: true,
          email: true,
          telefono: true,
          role: true,
          createdAt: true,
        },
      }) as Promise<UserSafe | null>;
  }

  // Actualizar datos (devuelve UserSafe)
  async update(id: number, data: Partial<User>): Promise<UserSafe> {
    return this.prisma.user
      .update({
        where: { id },
        data,
        select: {
          id: true,
          nombreCompleto: true,
          email: true,
          telefono: true,
          role: true,
          createdAt: true,
        },
      }) as Promise<UserSafe>;
  }

  // Eliminar usuario (devuelve UserSafe)
  async delete(id: number): Promise<UserSafe> {
    return this.prisma.user
      .delete({
        where: { id },
        select: {
          id: true,
          nombreCompleto: true,
          email: true,
          telefono: true,
          role: true,
          createdAt: true,
        },
      }) as Promise<UserSafe>;
  }

  // (Opcional) Contar cuántos administradores existen
  async countAdmins(): Promise<number> {
    return this.prisma.user.count({ where: { role: 'ADMIN' } });
  }
}
