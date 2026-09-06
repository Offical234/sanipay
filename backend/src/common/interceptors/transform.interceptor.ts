import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StandardResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: Record<string, any>;
}

function serializeBigInt(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }
  if (typeof data === 'bigint') {
    return data.toString();
  }
  if (Array.isArray(data)) {
    return data.map(serializeBigInt);
  }
  if (typeof data === 'object') {
    const result: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      result[key] = serializeBigInt(data[key]);
    }
    return result;
  }
  return data;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, StandardResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponse<T>> {
    return next.handle().pipe(
      map((res) => {
        // If already structured
        if (res && typeof res === 'object' && 'success' in res && 'data' in res) {
          return serializeBigInt(res);
        }

        const message =
          res && typeof res === 'object' && 'message' in res
            ? res.message
            : 'Operation completed successfully';

        const data =
          res && typeof res === 'object' && 'data' in res
            ? res.data
            : res;

        const meta =
          res && typeof res === 'object' && 'meta' in res
            ? serializeBigInt(res.meta)
            : undefined;

        const response: StandardResponse<T> = {
          success: true,
          message,
          data: serializeBigInt(data),
        };

        if (meta !== undefined) {
          response.meta = meta;
        }

        return response;
      }),
    );
  }
}
