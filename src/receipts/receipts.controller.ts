import {
    Controller,
    Post,
    Get,
    UseGuards,
    UploadedFile,
    UseInterceptors,
    Body,
    Req,
    Patch,
    Param,
    ParseIntPipe,
    Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UpdateReceiptDto } from './dto/update-receipt.dto';

@Controller('receipts')
export class ReceiptsController {
    constructor(private receiptsService: ReceiptsService) { }

    //Subir recibo (cualquier usuario autenticado)
    @UseGuards(JwtAuthGuard)
    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadReceipt(
        @UploadedFile() file: Express.Multer.File,
        @Body() dto: CreateReceiptDto,
        @Req() req: any,
    ) {
        const userId = req.user.userId;
        return this.receiptsService.uploadReceipt(file, userId, dto);
    }

    // Eliminar un recibo (solo ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Delete(':id')
    async deleteReceipt(@Param('id', ParseIntPipe) id: number) {
        return this.receiptsService.deleteReceipt(id);
    }

    //Ver mis recibos (usuario autenticado)
    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getMyReceipts(@Req() req: any) {
        const userId = req.user.userId;
        return this.receiptsService.getUserReceipts(userId);
    }

    //Cambiar estado de un recibo (solo ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Patch(':id')
    async updateReceiptStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateReceiptDto,
        @Req() req: any,
    ) {
        const adminId = req.user.userId; // viene del token JWT
        return this.receiptsService.updateReceiptStatus(id, dto.estado, adminId);
    }

    // Ver todos los recibos (solo ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get('all')
    async getAllReceipts(@Req() req: any) {
        return this.receiptsService.getAllReceipts();
    }

    // 🔧 TEMPORAL: Corregir permisos de archivos existentes en Cloudinary
    // Este endpoint cambia los archivos de privados a públicos
    // Ejecutar UNA VEZ después de actualizar el servicio
    // Luego se puede comentar o eliminar
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get('fix-access-mode')
    async fixAccessMode() {
        return this.receiptsService.fixFileAccessMode();
    }
}