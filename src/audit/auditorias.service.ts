import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateAuditoriaDto } from './dto/create-auditoria.dto';

@Injectable()
export class AuditoriasService {
    constructor(private prisma: PrismaService) { }

    //Crear auditoría (automática o futura manual)
    async create(data: CreateAuditoriaDto) {
        return this.prisma.auditoria.create({ data });
    }

    //Ver todas las auditorías (solo ADMIN)
    async findAll() {
        return this.prisma.auditoria.findMany({
            include: { usuario: { select: { nombreCompleto: true, email: true } } },
            orderBy: { fecha: 'desc' },
        });
    }

    //Ver las auditorías del usuario actual
    async findByUser(usuarioId: number) {
        return this.prisma.auditoria.findMany({
            where: { usuarioId },
            orderBy: { fecha: 'desc' },
        });
    }

    //Resumen estadístico para gráficos
    async resumen() {
        const total = await this.prisma.auditoria.count();

        const aprobaciones = await this.prisma.auditoria.count({
            where: { accion: 'APROBAR_RECIBO' },
        });

        const rechazos = await this.prisma.auditoria.count({
            where: { accion: 'RECHAZAR_RECIBO' },
        });

        const porAdmin = await this.prisma.auditoria.groupBy({
            by: ['usuarioId'],
            _count: { usuarioId: true },
        });

        const adminsConNombres = await Promise.all(
            porAdmin.map(async (a) => {
                const user = await this.prisma.user.findUnique({
                    where: { id: a.usuarioId },
                    select: { nombreCompleto: true },
                });
                return { admin: user?.nombreCompleto, total: a._count.usuarioId };
            }),
        );

        return {
            totalAcciones: total,
            accionesPorTipo: {
                APROBAR_RECIBO: aprobaciones,
                RECHAZAR_RECIBO: rechazos,
            },
            accionesPorAdmin: adminsConNombres,
        };
    }
}
