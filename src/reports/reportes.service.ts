import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ReportesService {
    constructor(private prisma: PrismaService) { }

    //Reporte general (ADMIN)
    async getResumenGeneral() {
        const totalRecibos = await this.prisma.receipt.count();
        const aprobados = await this.prisma.receipt.count({ where: { estado: 'APROBADO' } });
        const rechazados = await this.prisma.receipt.count({ where: { estado: 'RECHAZADO' } });

        const sumas = await this.prisma.liquidacion.aggregate({
            _sum: { valorSubsidio: true, valorTotal: true },
        });

        return {
            totalRecibos,
            aprobados,
            rechazados,
            totalSubsidios: sumas._sum.valorSubsidio || 0,
            totalLiquidados: sumas._sum.valorTotal || 0,
        };
    }

    //Totales por servicio (ADMIN)
    async getPorServicio() {
        const recibos = await this.prisma.receipt.findMany({
            select: { servicio: true, estado: true },
        });

        const map = new Map<string, { aprobados: number; rechazados: number }>();

        for (const r of recibos) {
            const serv = r.servicio.toLowerCase();
            const data = map.get(serv) || { aprobados: 0, rechazados: 0 };

            if (r.estado === 'APROBADO') data.aprobados++;
            if (r.estado === 'RECHAZADO') data.rechazados++;

            map.set(serv, data);
        }

        return Array.from(map, ([servicio, valores]) => ({
            servicio,
            ...valores,
        }));
    }

    //Totales por mes (ADMIN)
    async getPorMes() {
        const liquidaciones = await this.prisma.liquidacion.findMany({
            select: {
                fecha: true,
                valorSubsidio: true,
            },
        });

        const mesesMap = new Map<string, { totalSubsidio: number }>();

        for (const l of liquidaciones) {
            const mes = l.fecha.toISOString().slice(0, 7); // YYYY-MM
            const data = mesesMap.get(mes) || { totalSubsidio: 0 };
            data.totalSubsidio += l.valorSubsidio;
            mesesMap.set(mes, data);
        }

        return Array.from(mesesMap, ([mes, valores]) => ({
            mes,
            ...valores,
        }));
    }

    //Reporte personal (USER)
    async getReportesUsuario(userId: number) {
        const liquidaciones = await this.prisma.liquidacion.findMany({
            where: { recibo: { usuarioId: userId } },
            select: {
                valorTotal: true,
                valorSubsidio: true,
                fecha: true,
                recibo: { select: { servicio: true, monto: true, estado: true } },
            },
        });

        const totalSubsidios = liquidaciones.reduce((sum, l) => sum + l.valorSubsidio, 0);
        const totalLiquidados = liquidaciones.reduce((sum, l) => sum + l.valorTotal, 0);

        return {
            totalSubsidios,
            totalLiquidados,
            totalLiquidaciones: liquidaciones.length,
            liquidaciones,
        };
    }

    //Reporte mensual personal (USER)
    async getReportesUsuarioPorMes(userId: number) {
        const liquidaciones = await this.prisma.liquidacion.findMany({
            where: { recibo: { usuarioId: userId } },
            select: {
                fecha: true,
                valorTotal: true,
                valorSubsidio: true,
            },
        });

        const mesesMap = new Map<string, { totalSubsidio: number }>();

        for (const l of liquidaciones) {
            const mes = l.fecha.toISOString().slice(0, 7);
            const data = mesesMap.get(mes) || { totalSubsidio: 0 };
            data.totalSubsidio += l.valorSubsidio;
            mesesMap.set(mes, data);
        }

        return Array.from(mesesMap, ([mes, valores]) => ({
            mes,
            ...valores,
        }));
    }
}
