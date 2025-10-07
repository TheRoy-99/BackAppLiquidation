import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { LiquidacionesService } from './liquidaciones.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('liquidaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LiquidacionesController {
    constructor(private readonly liquidacionesService: LiquidacionesService) { }

    //ADMIN → ver todas las liquidaciones
    @Roles('ADMIN')
    @Get('all')
    async getAllLiquidaciones() {
        return this.liquidacionesService.getAllLiquidaciones();
    }

    //USER → ver solo las suyas
    @Roles('USER')
    @Get('me')
    async getMyLiquidaciones(@Req() req: any) {
        const userId = req.user.userId;
        return this.liquidacionesService.getUserLiquidaciones(userId);
    }
}
