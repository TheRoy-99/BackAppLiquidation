// receipts.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import cloudinary from './dto/cloudinary.provider';
import toStream = require('buffer-to-stream');
import { EstadoRecibo } from '@prisma/client';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { AuditoriasService } from '../audit/auditorias.service';
import { CreateAuditoriaDto } from '../audit/dto/create-auditoria.dto';

@Injectable()
export class ReceiptsService {
    constructor(
        private prisma: PrismaService,
        private auditoriasService: AuditoriasService,
    ) { }

    //Subir recibo (usuarios)
    async uploadReceipt(file: Express.Multer.File, userId: number, dto: CreateReceiptDto) {
        if (!file) throw new BadRequestException('No se recibió ningún archivo'); if (!file) throw new BadRequestException('No se recibió ningún archivo');

        //Validar tipo de archivo
        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
        if (!allowedTypes.includes(file.mimetype)) {
            throw new BadRequestException('Tipo de archivo no permitido. Solo PDF, PNG o JPG.');
        }

        //Limitar tamaño (5 MB)
        const maxSize = 5 * 1024 * 1024; // 5MB en bytes
        if (file.size > maxSize) {
            throw new BadRequestException('El archivo supera el tamaño máximo permitido (5MB).');
        }


        //Subida a Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
            const upload = cloudinary.uploader.upload_stream(
                {
                    folder: 'recibos',
                    resource_type: 'auto',
                    access_mode: 'public',
                },
                (error, result) => (error ? reject(error) : resolve(result)),
            );
            toStream(file.buffer).pipe(upload);
        });


        //Crear registro en BD
        const result: any = uploadResult;

        const receipt = await this.prisma.receipt.create({
            data: {
                servicio: dto.servicio,
                mes: dto.mes,
                monto: Number(dto.monto),
                archivoUrl: result.secure_url,  // URL pública
                archivoPublicId: result.public_id, // ✅ guardamos el id de Cloudinary
                usuarioId: userId,
            },
        });


        return { message: 'Recibo subido correctamente', receipt };
    }

    //Eliminar recibo (ADMIN)
    async deleteReceipt(id: number) {
        const receipt = await this.prisma.receipt.findUnique({ where: { id } });
        if (!receipt) throw new NotFoundException('Recibo no encontrado');
        if (receipt.archivoPublicId) {
            await cloudinary.uploader.destroy(receipt.archivoPublicId, {
                resource_type: 'auto',
            });
        }

        await this.prisma.receipt.delete({ where: { id } });
        return { message: 'Recibo eliminado correctamente', id };
    }

    //Obtener recibos del usuario autenticado
    async getUserReceipts(userId: number) {
        return this.prisma.receipt.findMany({
            where: { usuarioId: userId },
            orderBy: { fechaSubida: 'desc' },
        });
    }

    //Cambiar estado (solo ADMIN)
    async updateReceiptStatus(id: number, estado: string, adminId: number) {
        const receipt = await this.prisma.receipt.findUnique({ where: { id } });
        if (!receipt) throw new NotFoundException('Recibo no encontrado');

        const updated = await this.prisma.receipt.update({
            where: { id },
            data: { estado: estado as EstadoRecibo },
        });

        if (estado === 'APROBADO') {
            let porcentaje = 0;
            if (receipt.servicio.toLowerCase().includes('agua')) porcentaje = 0.1;
            else if (receipt.servicio.toLowerCase().includes('energ')) porcentaje = 0.15;

            const valorSubsidio = receipt.monto * porcentaje;
            const valorTotal = receipt.monto - valorSubsidio;

            await this.prisma.liquidacion.create({
                data: {
                    reciboId: receipt.id,
                    valorSubsidio,
                    valorTotal,
                    aprobadoPorId: adminId,
                },
            });

            const dto = new CreateAuditoriaDto();
            dto.usuarioId = adminId;
            dto.accion = 'APROBAR_RECIBO';
            dto.detalles = `Recibo #${receipt.id} aprobado con subsidio ${porcentaje * 100}%.`;
            await this.auditoriasService.create(dto);
        }

        if (estado === 'RECHAZADO') {
            const dto = new CreateAuditoriaDto();
            dto.usuarioId = adminId;
            dto.accion = 'RECHAZAR_RECIBO';
            dto.detalles = `Recibo #${receipt.id} rechazado.`;
            await this.auditoriasService.create(dto);
        }

        return { message: `Recibo ${estado.toLowerCase()} correctamente`, receipt: updated };
    }

    //Listar todos los recibos (ADMIN)
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
