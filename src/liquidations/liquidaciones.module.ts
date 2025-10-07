import { Module } from '@nestjs/common';
import { LiquidacionesService } from './liquidaciones.service';
import { LiquidacionesController } from './liquidaciones.controller';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [LiquidacionesController],
    providers: [LiquidacionesService, PrismaService],
})
export class LiquidacionesModule { }
