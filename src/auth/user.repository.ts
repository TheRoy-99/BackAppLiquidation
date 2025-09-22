import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) { }

  async create(data: {
    nombreCompleto: string;
    email: string;
    telefono: string;
    password: string;
  }): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async updatePassword(id: number, newPassword: string) {
    return this.prisma.user.update({
      where: { id },
      data: { password: newPassword },
    });
  }


  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        nombreCompleto: true,
        email: true,
        telefono: true,
        createdAt: true,
      },
    });

  }

}
