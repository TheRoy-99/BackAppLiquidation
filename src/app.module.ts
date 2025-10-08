import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { ConfigModule } from '@nestjs/config';
import { LiquidacionesModule } from './liquidations/liquidaciones.module';
import { ReportesModule } from './reports/reportes.module';
import { AuditoriasModule } from './audit/auditorias.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule, 
    UsersModule,
    ReceiptsModule,
    LiquidacionesModule,
    ReportesModule,
    AuditoriasModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
