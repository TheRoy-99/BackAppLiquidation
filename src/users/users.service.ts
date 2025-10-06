import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository, UserSafe } from '../auth/user.repository';

@Injectable()
export class UsersService {
    constructor(private userRepo: UserRepository) { }

    async getAllUsers(): Promise<UserSafe[]> {
        return this.userRepo.findAll();
    }

    async getUserById(id: number): Promise<UserSafe> {
        const user = await this.userRepo.findById(id);
        if (!user) throw new NotFoundException('Usuario no encontrado');
        return user;
    }

    async updateUser(id: number, data: Partial<UserSafe>): Promise<UserSafe> {
        const user = await this.userRepo.findById(id);
        if (!user) throw new NotFoundException('Usuario no encontrado');
        return this.userRepo.update(id, data);
    }

    async deleteUser(id: number): Promise<UserSafe> {
        const user = await this.userRepo.findById(id);
        if (!user) throw new NotFoundException('Usuario no encontrado');
        return this.userRepo.delete(id);
    }

    async createUser(data: any): Promise<UserSafe> {
        const existing = await this.userRepo.findByEmail(data.email);
        if (existing) throw new ConflictException('El correo ya está registrado');

        const hashedPassword = await bcrypt.hash(data.password, 10);
        return this.userRepo.create({
            nombreCompleto: data.nombreCompleto,
            email: data.email,
            telefono: data.telefono,
            password: hashedPassword,
            role: data.role || 'USER',
        });
    }
}
