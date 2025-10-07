import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ReportesService {
    constructor(private prisma: PrismaService) { }

    // 📊 Reporte general (ADMIN)
    async getResumenGeneral() {
        const totalLiquidaciones = await this.prisma.liquidacion.count();
        const sumas = await this.prisma.liquidacion.aggregate({
            _sum: { valorTotal: true, valorSubsidio: true },
        });

        return {
            totalLiquidaciones,
            totalSubsidios: sumas._sum.valorSubsidio || 0,
            totalLiquidados: sumas._sum.valorTotal || 0,
        };
    }

    // 📈 Totales por servicio (ADMIN)
    async getPorServicio() {
        const liquidaciones = await this.prisma.liquidacion.findMany({
            include: { recibo: { select: { servicio: true } } },
        });

        const serviciosMap = new Map<
            string,
            { total: number; subsidio: number; count: number }
        >();

        for (const l of liquidaciones) {
            const serv = l.recibo.servicio.toLowerCase();
            const data = serviciosMap.get(serv) || {
                total: 0,
                subsidio: 0,
                count: 0,
            };
            data.total += l.valorTotal;
            data.subsidio += l.valorSubsidio;
            data.count += 1;
            serviciosMap.set(serv, data);
        }

        return Array.from(serviciosMap, ([servicio, valores]) => ({
            servicio,
            ...valores,
        }));
    }

    // 📅 Totales por mes (ADMIN)
    async getPorMes() {
        const liquidaciones = await this.prisma.liquidacion.findMany({
            select: {
                fecha: true,
                valorTotal: true,
                valorSubsidio: true,
            },
        });

        const mesesMap = new Map<
            string,
            { total: number; subsidio: number; count: number }
        >();

        for (const l of liquidaciones) {
            const mes = l.fecha.toISOString().slice(0, 7); // formato YYYY-MM
            const data = mesesMap.get(mes) || {
                total: 0,
                subsidio: 0,
                count: 0,
            };
            data.total += l.valorTotal;
            data.subsidio += l.valorSubsidio;
            data.count += 1;
            mesesMap.set(mes, data);
        }

        return Array.from(mesesMap, ([mes, valores]) => ({
            mes,
            ...valores,
        }));
    }

    // 👤 Reporte personal (USER)
    async getReportesUsuario(userId: number) {
        const liquidaciones = await this.prisma.liquidacion.findMany({
            where: { recibo: { usuarioId: userId } },
            select: {
                valorTotal: true,
                valorSubsidio: true,
                fecha: true,
                recibo: {
                    select: { servicio: true, monto: true, estado: true },
                },
            },
        });

        const totalSubsidios = liquidaciones.reduce(
            (sum, l) => sum + l.valorSubsidio,
            0,
        );
        const totalLiquidados = liquidaciones.reduce(
            (sum, l) => sum + l.valorTotal,
            0,
        );

        return {
            totalSubsidios,
            totalLiquidados,
            totalLiquidaciones: liquidaciones.length,
            liquidaciones,
        };
    }

    // 📅 Reporte mensual personal (USER)
    async getReportesUsuarioPorMes(userId: number) {
        const liquidaciones = await this.prisma.liquidacion.findMany({
            where: { recibo: { usuarioId: userId } },
            select: {
                fecha: true,
                valorTotal: true,
                valorSubsidio: true,
            },
        });

        const mesesMap = new Map<
            string,
            { total: number; subsidio: number; count: number }
        >();

        for (const l of liquidaciones) {
            const mes = l.fecha.toISOString().slice(0, 7);
            const data = mesesMap.get(mes) || {
                total: 0,
                subsidio: 0,
                count: 0,
            };
            data.total += l.valorTotal;
            data.subsidio += l.valorSubsidio;
            data.count += 1;
            mesesMap.set(mes, data);
        }

        return Array.from(mesesMap, ([mes, valores]) => ({
            mes,
            ...valores,
        }));
    }
}
