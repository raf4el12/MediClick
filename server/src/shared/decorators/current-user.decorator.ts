import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { getRequestFromContext } from '../utils/get-request-from-context.js';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = getRequestFromContext(ctx);
    const user = request.user;
    return data ? (user as Record<string, unknown>)?.[data] : user;
  },
);
