import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateAuditoriaDto {
    @IsInt()
    usuarioId: number;

    @IsString()
    accion: string;

    @IsOptional()
    @IsString()
    detalles?: string;
}
