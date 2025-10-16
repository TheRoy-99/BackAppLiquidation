import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
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
        if (!file) throw new BadRequestException('No se recibió ningún archivo');

        //Validar tipo de archivo
        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
        if (!allowedTypes.includes(file.mimetype)) {
            throw new BadRequestException('Tipo de archivo no permitido. Solo PDF, PNG o JPG.');
        }

        //Limitar tamaño (5 MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new BadRequestException('El archivo supera el tamaño máximo permitido (5MB).');
        }

        try {
            //Detectar extensión correcta del archivo
            const fileExtension = file.mimetype === 'application/pdf'
                ? '.pdf'
                : file.mimetype === 'image/png'
                    ? '.png'
                    : '.jpg';

            //Generar public_id con extensión
            const publicId = `recibo_${userId}_${Date.now()}${fileExtension}`;

            const uploadResult = await new Promise((resolve, reject) => {
                const upload = cloudinary.uploader.upload_stream(
                    {
                        folder: 'recibos',
                        resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'image',
                        //CRÍTICO: Configuración para que sea público y accesible
                        type: 'upload',  // Tipo de entrega
                        access_mode: 'public',  // Acceso público
                        public_id: publicId,
                        //Para PDFs, no aplicar transformaciones
                        ...(file.mimetype.startsWith('image/') && {
                            transformation: [
                                { quality: 'auto:good' },
                                { fetch_format: 'auto' }
                            ]
                        })
                    },
                    (error, result) => (error ? reject(error) : resolve(result)),
                );
                toStream(file.buffer).pipe(upload);
            });

            const result: any = uploadResult;

            //Log para debugging
            console.log('Archivo subido a Cloudinary:', {
                url: result.secure_url,
                publicId: result.public_id,
                resourceType: result.resource_type,
                format: result.format,
                accessMode: result.access_mode,
                type: result.type
            });

            const receipt = await this.prisma.receipt.create({
                data: {
                    servicio: dto.servicio,
                    mes: dto.mes,
                    monto: Number(dto.monto),
                    archivoUrl: result.secure_url,
                    archivoPublicId: result.public_id,
                    usuarioId: userId,
                },
            });

            return { message: 'Recibo subido correctamente', receipt };

        } catch (error) {
            console.error('Error al subir archivo a Cloudinary:', error);
            throw new InternalServerErrorException('Error al subir el archivo. Intenta nuevamente.');
        }
    }

    //MEJORADO: Eliminar recibo Y su liquidación si existe
    async deleteReceipt(id: number) {
        const receipt = await this.prisma.receipt.findUnique({
            where: { id },
            include: { liquidacion: true }
        });

        if (!receipt) {
            throw new NotFoundException('Recibo no encontrado');
        }

        //Si tiene liquidación, eliminar primero
        if (receipt.liquidacion) {
            try {
                await this.prisma.liquidacion.delete({
                    where: { reciboId: id }
                });
                console.log(`Liquidación del recibo ${id} eliminada`);
            } catch (error) {
                console.error('Error al eliminar liquidación:', error);
            }
        }

        //Intentar eliminar de Cloudinary
        if (receipt.archivoPublicId) {
            try {
                // Quitar extensión (Cloudinary maneja IDs sin extensión)
                const cleanId = receipt.archivoPublicId.replace(/\.(pdf|png|jpg|jpeg)$/i, '');

                // Detectar tipo
                let resourceType: 'image' | 'raw' = 'image';
                if (receipt.archivoUrl?.includes('/raw/upload/') || cleanId.toLowerCase().endsWith('.pdf')) {
                    resourceType = 'raw';
                }

                console.log(`Intentando eliminar Cloudinary:`, {
                    cleanId,
                    resourceType,
                    originalId: receipt.archivoPublicId
                });

                const result = await cloudinary.uploader.destroy(cleanId, { resource_type: resourceType });
                console.log('Resultado Cloudinary:', result);

                if (result.result === 'not found') {
                    console.warn(`No encontrado como '${resourceType}', probando el otro tipo...`);
                    const altType: 'image' | 'raw' = resourceType === 'raw' ? 'image' : 'raw';
                    const retry = await cloudinary.uploader.destroy(cleanId, { resource_type: altType });
                    console.log(`Reintento (${altType}):`, retry);
                }

            } catch (error) {
                console.error('Error al eliminar archivo de Cloudinary:', error);
                console.warn('Continuando con la eliminación del registro en BD...');
            }
        }

        //Eliminar el recibo en BD
        try {
            await this.prisma.receipt.delete({ where: { id } });
            console.log(`Recibo ${id} eliminado de la base de datos`);
            return {
                message: 'Recibo y liquidación eliminados correctamente',
                id,
                hadLiquidation: !!receipt.liquidacion
            };
        } catch (dbError) {
            console.error('Error al eliminar recibo de BD:', dbError);
            throw new InternalServerErrorException('Error al eliminar el recibo de la base de datos');
        }
    }

    //Obtener recibos del usuario autenticado
    async getUserReceipts(userId: number) {
        return this.prisma.receipt.findMany({
            where: { usuarioId: userId },
            orderBy: { fechaSubida: 'desc' },
        });
    }

    //MEJORADO: Cambiar estado con gestión inteligente de liquidaciones
    async updateReceiptStatus(id: number, estado: string, adminId: number) {
        const receipt = await this.prisma.receipt.findUnique({
            where: { id },
            include: { liquidacion: true }
        });

        if (!receipt) throw new NotFoundException('Recibo no encontrado');

        const oldStatus = receipt.estado;
        const newStatus = estado as EstadoRecibo;

        //CASO 1: Cambio de APROBADO a RECHAZADO
        if (oldStatus === 'APROBADO' && newStatus === 'RECHAZADO') {
            if (receipt.liquidacion) {
                await this.prisma.liquidacion.delete({ where: { reciboId: id } });
                console.log(`Liquidación eliminada al rechazar recibo ${id}`);
            }
        }

        //CASO 2: Cambio de PENDIENTE o RECHAZADO → APROBADO
        if (newStatus === 'APROBADO' && oldStatus !== 'APROBADO') {
            if (receipt.liquidacion) {
                await this.prisma.liquidacion.delete({ where: { reciboId: id } });
            }

            // 🔹 Tabla de subsidios configurables
            const subsidios: Record<string, number> = {
                agua: 0.10,     // 10%
                energia: 0.15,  // 15%
                gas: 0.05,      // 5%
            };

            // Detectar porcentaje según el servicio
            let porcentaje = 0;
            const servicio = receipt.servicio.toLowerCase();
            for (const key in subsidios) {
                if (servicio.includes(key)) {
                    porcentaje = subsidios[key];
                    break;
                }
            }

            // Calcular subsidio y total
            const valorSubsidio = Number((receipt.monto * porcentaje).toFixed(2));
            const valorTotal = Number((receipt.monto - valorSubsidio).toFixed(2));

            await this.prisma.liquidacion.create({
                data: {
                    reciboId: receipt.id,
                    valorSubsidio,
                    valorTotal,
                    aprobadoPorId: adminId,
                },
            });

            console.log(
                `Liquidación creada para recibo ${id}: servicio=${receipt.servicio}, subsidio=${porcentaje * 100}%`
            );
        }

        //CASO 3: Cambio de APROBADO a PENDIENTE
        if (oldStatus === 'APROBADO' && newStatus === 'PENDIENTE') {
            if (receipt.liquidacion) {
                await this.prisma.liquidacion.delete({ where: { reciboId: id } });
                console.log(`Liquidación eliminada al regresar recibo ${id} a PENDIENTE`);
            }
        }

        // Actualizar el estado del recibo
        const updated = await this.prisma.receipt.update({
            where: { id },
            data: { estado: newStatus },
        });

        // Registrar auditoría
        const dto = new CreateAuditoriaDto();
        dto.usuarioId = adminId;

        if (newStatus === 'APROBADO') {
            dto.accion = 'APROBAR_RECIBO';
            dto.detalles = `Recibo #${receipt.id} aprobado (cambio de ${oldStatus} a ${newStatus}).`;
        } else if (newStatus === 'RECHAZADO') {
            dto.accion = 'RECHAZAR_RECIBO';
            dto.detalles = `Recibo #${receipt.id} rechazado (cambio de ${oldStatus} a ${newStatus}).`;
        } else {
            dto.accion = 'CAMBIAR_ESTADO_RECIBO';
            dto.detalles = `Recibo #${receipt.id} cambió de ${oldStatus} a ${newStatus}.`;
        }

        await this.auditoriasService.create(dto);

        return {
            message: `Recibo ${estado.toLowerCase()} correctamente`,
            receipt: updated,
            oldStatus,
            newStatus,
        };
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
                liquidacion: { //Incluir liquidación para verificar
                    select: {
                        id: true,
                        valorSubsidio: true,
                        valorTotal: true,
                    }
                }
            },
        });
    }

    //NUEVO: Corregir permisos de archivos existentes (cambiar a público)
    async fixFileAccessMode() {
        const receipts = await this.prisma.receipt.findMany();
        const results: Array<{
            id: number;
            publicId: string;
            status: 'success' | 'error';
            accessMode?: 'public';
            url?: string;
            error?: string;
        }> = [];

        console.log(`Iniciando corrección de permisos para ${receipts.length} recibos...`);

        for (const receipt of receipts) {
            if (receipt.archivoPublicId) {
                try {
                    // Detectar resource_type
                    const resourceType: 'image' | 'raw' =
                        receipt.archivoUrl?.includes('/raw/') ||
                            receipt.archivoPublicId.toLowerCase().endsWith('.pdf')
                            ? 'raw'
                            : 'image';

                    console.log(`recibo ${receipt.id}: ${receipt.archivoPublicId} (${resourceType})`);

                    // Cambiar a público usando explicit
                    const result = await cloudinary.uploader.explicit(
                        receipt.archivoPublicId,
                        {
                            resource_type: resourceType,
                            type: 'upload',
                            access_mode: 'public'
                        }
                    );

                    console.log(`Recibo ${receipt.id} actualizado a público`);

                    results.push({
                        id: receipt.id,
                        publicId: receipt.archivoPublicId,
                        status: 'success',
                        accessMode: 'public',
                        url: result.secure_url
                    });

                    // Actualizar URL si cambió
                    if (result.secure_url !== receipt.archivoUrl) {
                        await this.prisma.receipt.update({
                            where: { id: receipt.id },
                            data: { archivoUrl: result.secure_url }
                        });
                        console.log(`URL actualizada para recibo ${receipt.id}`);
                    }

                } catch (error: any) {
                    console.error(`Error al procesar recibo ${receipt.id}:`, error.message);

                    results.push({
                        id: receipt.id,
                        publicId: receipt.archivoPublicId,
                        status: 'error',
                        error: error.message
                    });
                }
            }
        }

        const successCount = results.filter(r => r.status === 'success').length;
        const errorCount = results.filter(r => r.status === 'error').length;

        console.log(`\nResumen:`);
        console.log(`   Exitosos: ${successCount}`);
        console.log(`   Errores: ${errorCount}`);

        return {
            message: `Proceso completado: ${successCount} exitosos, ${errorCount} errores`,
            totalProcessed: receipts.length,
            success: successCount,
            errors: errorCount,
            details: results
        };
    }
}