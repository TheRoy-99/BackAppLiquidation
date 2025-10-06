import { Controller, Get, Param, Patch, Delete, Body, UseGuards, Req, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
    constructor(private usersService: UsersService) { }

    //POST /users/register — Solo ADMIN puede registrar nuevos usuarios
    @Post('register')
    @Roles('ADMIN')
    async createUser(@Body() data: any) {
        return this.usersService.createUser(data);
    }

    @Get()
    @Roles('ADMIN')
    async getAll() {
        return this.usersService.getAllUsers();
    }

    @Get('me')
    async getProfile(@Req() req) {
        return this.usersService.getUserById(req.user.sub);
    }

    @Get(':id')
    @Roles('ADMIN')
    async getById(@Param('id') id: string) {
        return this.usersService.getUserById(Number(id));
    }

    @Patch('me')
    async updateProfile(@Req() req, @Body() data: any) {
        return this.usersService.updateUser(req.user.sub, data);
    }

    @Delete(':id')
    @Roles('ADMIN')
    async deleteUser(@Param('id') id: string) {
        return this.usersService.deleteUser(Number(id));
    }
}
