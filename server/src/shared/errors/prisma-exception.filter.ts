import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception.code === 'P2025') {
      return response.status(404).json({
        statusCode: 404,
        message: 'El recurso solicitado no existe',
      });
    }

    if (exception.code === 'P2002') {
      return response.status(400).json({
        statusCode: 400,
        message: 'Ya existe un registro con esos datos',
      });
    }

    return response.status(500).json({
      statusCode: 500,
      message: 'Error desconocido en la base de datos',
    });
  }
}
