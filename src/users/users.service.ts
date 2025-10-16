import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    // 📋 Obtener todos los usuarios
    async getAllUsers() {
        return this.prisma.user.findMany({
            select: {
                id: true,
                nombreCompleto: true,
                email: true,
                telefono: true,
                role: true,
                createdAt: true,
            },
        });
    }

    //Obtener usuario por ID
    async getUserById(id: number) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                nombreCompleto: true,
                email: true,
                telefono: true,
                role: true,
                createdAt: true,
            },
        });

        if (!user) throw new NotFoundException('Usuario no encontrado');
        return user;
    }

    //Actualizar datos del usuario
    async updateUser(id: number, data: any) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('Usuario no encontrado');

        return this.prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                nombreCompleto: true,
                email: true,
                telefono: true,
                role: true,
            },
        });
    }

    // Eliminar usuario
    async deleteUser(id: number) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('Usuario no encontrado');

        return this.prisma.user.delete({
            where: { id },
            select: {
                id: true,
                nombreCompleto: true,
                email: true,
            },
        });
    }

    // Crear usuario
    async createUser(data: any) {
        const existing = await this.prisma.user.findUnique({
            where: { email: data.email },
        });
        if (existing) throw new ConflictException('El correo ya está registrado');

        const hashedPassword = await bcrypt.hash(data.password, 10);

        return this.prisma.user.create({
            data: {
                nombreCompleto: data.nombreCompleto,
                email: data.email,
                telefono: data.telefono,
                password: hashedPassword,
                role: data.role || 'USER',
            },
            select: {
                id: true,
                nombreCompleto: true,
                email: true,
                telefono: true,
                role: true,
            },
        });
    }

    //Cambiar rol del usuario
    async changeUserRole(id: number, role: string) {
        if (!['ADMIN', 'USER'].includes(role)) {
            throw new BadRequestException('Rol inválido');
        }

        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('Usuario no encontrado');

        return this.prisma.user.update({
            where: { id },
            data: { role: role as Role },
            select: {
                id: true,
                nombreCompleto: true,
                email: true,
                role: true,
            },
        });
    }

    //Cambiar contraseña
    async changePassword(id: number, oldPassword: string, newPassword: string) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('Usuario no encontrado');

        const match = await bcrypt.compare(oldPassword, user.password);
        if (!match) throw new BadRequestException('Contraseña actual incorrecta');

        const hashed = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id },
            data: { password: hashed },
        });

        return { message: 'Contraseña actualizada correctamente' };
    }
}
