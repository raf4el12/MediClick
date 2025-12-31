import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggingService } from './shared/logging/logging.service';
import { AllExceptionsFilter } from './shared/exceptions/exception.filter';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { PrismaExceptionFilter } from './shared/errors/prisma-exception.filter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';

async function main() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: true,
    rawBody: false,
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  const winstonLogger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(winstonLogger);

  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    process.env.FRONTEND_URL,
    process.env.APP_FRONTEND_URL,
    'https://appqa.ibcinstituto.com',
    'https://app.ibcidiomas.com',
    'https://cepalestudio.com',
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
  });

  app.use(cookieParser());

  const loggingService = await app.resolve(LoggingService);

  app.useGlobalFilters(
    new AllExceptionsFilter(loggingService),
    new PrismaExceptionFilter(),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => {
        //   const messages = errors.map(err => ({
        //     property: err.property,
        //     constraints: err.constraints,
        //   }));
        //   console.error('Validation Error:', JSON.stringify(messages, null, 2));
        //   return new BadRequestException('Validation failed');

        const formatted = errors.map((e) => ({
          campo: e.property,
          errores: Object.values(e.constraints ?? {}),
        }));
        const currentPath = Reflect.get(errors[0], 'target')
          ? Reflect.get(errors[0].target, 'constructor')?.name
          : 'Desconocido';
        console.warn(
          '\x1b[33m%s\x1b[0m',
          `⚠️  Errores de validación detectados [Ruta: ${currentPath}]:\n` +
            JSON.stringify(formatted, null, 2),
        );
        return new BadRequestException({
          statusCode: 400,
          message: 'Error de validación en los datos enviados.',
          detalles: formatted,
        });
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Documentation IBC Idiomas')
    .setDescription('Documentation of API for all modules')
    .setVersion('1.0')
    // .addBearerAuth() // si luego usas JWT
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const PORT = process.env.PORT || 3000;

  // Habilitar shutdown hooks para que onModuleDestroy se ejecute correctamente
  // y las conexiones de Prisma se cierren al detener el servidor
  app.enableShutdownHooks();

  await app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📘 Swagger disponible en: http://localhost:${PORT}/docs`);
  });
}

main();
