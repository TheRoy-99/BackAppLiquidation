import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuditoriasService } from './auditorias.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('auditorias')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditoriasController {
    constructor(private readonly auditoriasService: AuditoriasService) { }

    //ADMIN → Ver todas las auditorías
    @Get('all')
    @Roles('ADMIN')
    findAll() {
        return this.auditoriasService.findAll();
    }

    //USER → Ver sus propias auditorías
    @Get('me')
    @Roles('USER')
    findMine(@Req() req) {
        return this.auditoriasService.findByUser(req.user.id);
    }

    //ADMIN → Datos resumidos para reportes
    @Get('resumen')
    @Roles('ADMIN')
    resumen() {
        return this.auditoriasService.resumen();
    }
}
