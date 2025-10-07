import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class LiquidacionesService {
    constructor(private prisma: PrismaService) { }

    //ADMIN: ver todas las liquidaciones
    async getAllLiquidaciones() {
        return this.prisma.liquidacion.findMany({
            orderBy: { fecha: 'desc' },
            include: {
                aprobadoPor: {
                    select: { id: true, nombreCompleto: true, email: true },
                },
                recibo: {
                    select: {
                        id: true,
                        servicio: true,
                        monto: true,
                        usuario: {
                            select: { id: true, nombreCompleto: true, email: true },
                        },
                    },
                },
            },
        });
    }

    //USER: ver solo mis liquidaciones (por recibos del usuario)
    async getUserLiquidaciones(userId: number) {
        return this.prisma.liquidacion.findMany({
            orderBy: { fecha: 'desc' },
            where: {
                recibo: { usuarioId: userId },
            },
            include: {
                recibo: {
                    select: {
                        id: true,
                        servicio: true,
                        monto: true,
                        estado: true,
                        fechaSubida: true,
                    },
                },
            },
        });
    }
}
