import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportesController {
    constructor(private readonly reportesService: ReportesService) { }

    //ADMIN → resumen general
    @Roles('ADMIN')
    @Get('general')
    async getGeneral() {
        return this.reportesService.getResumenGeneral();
    }

    //ADMIN → totales por servicio
    @Roles('ADMIN')
    @Get('por-servicio')
    async getPorServicio() {
        return this.reportesService.getPorServicio();
    }

    //ADMIN → totales por mes
    @Roles('ADMIN')
    @Get('por-mes')
    async getPorMes() {
        return this.reportesService.getPorMes();
    }

    // USER → su resumen personal
    @Roles('USER')
    @Get('mis-reportes')
    async getMisReportes(@Req() req: any) {
        const userId = req.user.userId;
        return this.reportesService.getReportesUsuario(userId);
    }

    // USER → sus datos agrupados por mes
    @Roles('USER')
    @Get('mis-mensuales')
    async getMisReportesMensuales(@Req() req: any) {
        const userId = req.user.userId;
        return this.reportesService.getReportesUsuarioPorMes(userId);
    }
}
