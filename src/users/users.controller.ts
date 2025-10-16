import {
    Controller,
    Get,
    Param,
    Patch,
    Delete,
    Body,
    UseGuards,
    Req,
    Post,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import * as bcrypt from 'bcrypt';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
    constructor(private usersService: UsersService) {}

    // POST /users/register — Solo ADMIN puede registrar nuevos usuarios
    @Post('register')
    @Roles('ADMIN')
    async createUser(@Body() data: any) {
        return this.usersService.createUser(data);
    }

    // GET /users/all — Solo ADMIN puede listar todos los usuarios
    @Get('all')
    @Roles('ADMIN')
    async getAll() {
        return this.usersService.getAllUsers();
    }

    // GET /users/me — Perfil del usuario autenticado
    @Get('me')
    async getProfile(@Req() req) {
        console.log('Payload JWT recibido en /users/me:', req.user);

        const userId = req.user?.userId || req.user?.sub;
        console.log('ID detectado:', userId);

        if (!userId) {
            throw new BadRequestException('Token inválido: no contiene ID de usuario');
        }

        const user = await this.usersService.getUserById(Number(userId));
        return user;
    }

    // GET /users/:id — Solo ADMIN puede ver otro usuario
    @Get(':id')
    @Roles('ADMIN')
    async getById(@Param('id') id: string) {
        return this.usersService.getUserById(Number(id));
    }

    // PATCH /users/me — Actualizar perfil del usuario autenticado
    @Patch('me')
    async updateProfile(@Req() req, @Body() data: any) {
        const userId = req.user?.userId || req.user?.sub;

        // Solo se permite actualizar nombre y teléfono
        const allowedFields = ['nombreCompleto', 'telefono'];
        const filteredData: any = {};
        for (const key of allowedFields) {
            if (data[key] !== undefined) filteredData[key] = data[key];
        }

        if (Object.keys(filteredData).length === 0) {
            throw new BadRequestException(
                'No hay campos válidos para actualizar (solo nombreCompleto o telefono).',
            );
        }

        return this.usersService.updateUser(Number(userId), filteredData);
    }

    // DELETE /users/:id — Solo ADMIN puede eliminar usuarios
    @Delete(':id')
    @Roles('ADMIN')
    async deleteUser(@Param('id') id: string) {
        return this.usersService.deleteUser(Number(id));
    }

    // PATCH /users/:id/role — Solo ADMIN puede cambiar roles
    @Patch(':id/role')
    @Roles('ADMIN')
    async changeUserRole(@Param('id') id: string, @Body() body: { role: string }) {
        return this.usersService.changeUserRole(Number(id), body.role);
    }

    // PATCH /users/me/password — Cambiar contraseña
    @Patch('me/password')
    async changePassword(
        @Req() req,
        @Body() data: { oldPassword: string; newPassword: string },
    ) {
        const userId = req.user?.userId || req.user?.sub;

        if (!data.oldPassword || !data.newPassword)
            throw new BadRequestException('Datos incompletos');

        return this.usersService.changePassword(
            Number(userId),
            data.oldPassword,
            data.newPassword,
        );
    }
}
