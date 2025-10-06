import { IsEnum } from 'class-validator';
import { EstadoRecibo } from '@prisma/client';

export class UpdateReceiptDto {
    @IsEnum(EstadoRecibo, {
        message: 'El estado debe ser uno de: PENDIENTE, APROBADO o RECHAZADO',
    })
    estado: EstadoRecibo;
}
