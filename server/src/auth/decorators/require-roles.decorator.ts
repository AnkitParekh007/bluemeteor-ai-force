import { SetMetadata } from '@nestjs/common';

import { ROLES_KEY } from '../auth.constants';

/** User must have at least one of the listed roles (by key). */
export const RequireRoles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
