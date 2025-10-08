import { Module } from '@nestjs/common';
import { AuditoriasService } from './auditorias.service';
import { AuditoriasController } from './auditorias.controller';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [AuditoriasController],
    providers: [AuditoriasService, PrismaService],
    exports: [AuditoriasService],
})
export class AuditoriasModule { }
