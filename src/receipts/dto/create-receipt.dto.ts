import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReceiptDto {
    @IsString()
    servicio: string;

    @IsString()
    mes: string;

    @Type(() => Number)
    @IsNumber()
    monto: number;

    @IsOptional()
    @IsString()
    archivoUrl?: string;
}
