import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../guards/jwt-auth.guard';

/** Mark a controller or route handler as publicly accessible (no JWT required) */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';

/** Specify one or more user roles authorized to access this handler or controller */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/** Extract the authenticated user object from the JWT-validated request */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
