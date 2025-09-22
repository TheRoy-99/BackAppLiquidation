import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Habilitar CORS antes de escuchar
  app.enableCors({
    origin: 'http://localhost:5173', // frontend Vite
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀  Application is running on: http://localhost:${port}`);
}
bootstrap();
