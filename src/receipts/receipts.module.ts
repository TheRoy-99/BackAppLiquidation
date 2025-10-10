import { Module } from '@nestjs/common';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { PrismaService } from '../prisma.service';
import { CloudinaryProvider } from './dto/cloudinary.provider';
import { RolesGuard } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditoriasModule } from 'src/audit/auditorias.module';

@Module({
    imports: [AuditoriasModule],
    controllers: [ReceiptsController],
    providers: [
        ReceiptsService,
        PrismaService,
        CloudinaryProvider,
        RolesGuard,
        JwtAuthGuard,
    ],
})
export class ReceiptsModule { }
