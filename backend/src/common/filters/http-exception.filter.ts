import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const httpEx = exception as any;
    const status = httpEx?.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR;
    const message = httpEx?.getResponse?.() || 'Internal server error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: typeof message === 'string' ? message : (message as any).message || 'Internal server error',
      errorCode: (message as any)?.errorCode || null,
    };

    response.status(status).json(errorResponse);
  }
}
