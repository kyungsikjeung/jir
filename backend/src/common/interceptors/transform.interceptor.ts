import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): any {
    return next.handle().then((data: any) => ({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }));
  }
}
