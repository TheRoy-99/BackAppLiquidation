import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { v2 as cloudinary } from 'cloudinary';
import toStream = require('buffer-to-stream');
import { EstadoRecibo } from '@prisma/client';
import { CreateReceiptDto } from './dto/create-receipt.dto';

@Injectable()
export class ReceiptsService {
    constructor(private prisma: PrismaService) { }

    //Eliminar un recibo (solo ADMIN)
    async deleteReceipt(id: number) {
        const receipt = await this.prisma.receipt.findUnique({ where: { id } });
        if (!receipt) throw new NotFoundException('Recibo no encontrado');

        await this.prisma.receipt.delete({ where: { id } });
        return { message: 'Recibo eliminado correctamente', id };
    }

    //Subir recibo
    async uploadReceipt(file: Express.Multer.File, userId: number, dto: CreateReceiptDto) {
        const uploadResult = await new Promise((resolve, reject) => {
            const upload = cloudinary.uploader.upload_stream(
                { folder: 'recibos', resource_type: 'auto' },
                (error, result) => (error ? reject(error) : resolve(result)),
            );
            toStream(file.buffer).pipe(upload);
        });

        const result: any = uploadResult;

        const receipt = await this.prisma.receipt.create({
            data: {
                servicio: dto.servicio,
                mes: dto.mes,
                monto: Number(dto.monto),
                archivoUrl: result.secure_url,
                usuarioId: userId,
            },
        });

        return { message: 'Recibo subido correctamente', receipt };
    }

    //Ver recibos del usuario autenticado
    async getUserReceipts(userId: number) {
        return this.prisma.receipt.findMany({
            where: { usuarioId: userId },
            orderBy: { fechaSubida: 'desc' },
        });
    }

    //Actualizar estado (ADMIN)
    async updateReceiptStatus(id: number, estado: string, adminId: number) {
        const receipt = await this.prisma.receipt.findUnique({ where: { id } });
        if (!receipt) throw new NotFoundException('Recibo no encontrado');

        // Actualizar estado del recibo
        const updated = await this.prisma.receipt.update({
            where: { id },
            data: { estado: estado as EstadoRecibo },
        });

        // Si fue aprobado, crear una liquidación
        if (estado === 'APROBADO') {
            let porcentaje = 0;
            if (receipt.servicio.toLowerCase().includes('agua')) porcentaje = 0.1;
            else if (receipt.servicio.toLowerCase().includes('energ')) porcentaje = 0.15;

            const valorSubsidio = receipt.monto * porcentaje;
            const valorTotal = receipt.monto - valorSubsidio;

            // Crear la liquidación
            await this.prisma.liquidacion.create({
                data: {
                    reciboId: receipt.id,
                    valorSubsidio,
                    valorTotal,
                    aprobadoPorId: adminId, // ← ahora siempre es number
                },
            });

            // Registrar auditoría
            await this.prisma.auditoria.create({
                data: {
                    usuarioId: adminId,
                    accion: 'APROBAR_RECIBO',
                    detalles: `Recibo #${receipt.id} aprobado. Subsidio ${porcentaje * 100}%.`,
                },
            });
        }

        // Si fue rechazado, registrar auditoría
        if (estado === 'RECHAZADO') {
            await this.prisma.auditoria.create({
                data: {
                    usuarioId: adminId,
                    accion: 'RECHAZAR_RECIBO',
                    detalles: `Recibo #${receipt.id} rechazado.`,
                },
            });
        }

        return { message: `Recibo ${estado.toLowerCase()} correctamente`, receipt: updated };
    }

    //Listar todos los recibos (solo ADMIN)
    async getAllReceipts(estado?: string) {
        return this.prisma.receipt.findMany({
            where: estado ? { estado: estado as EstadoRecibo } : {},
            orderBy: { fechaSubida: 'desc' },
            include: {
                usuario: {
                    select: {
                        id: true,
                        nombreCompleto: true,
                        email: true,
                        telefono: true,
                    },
                },
            },
        });
    }
}
