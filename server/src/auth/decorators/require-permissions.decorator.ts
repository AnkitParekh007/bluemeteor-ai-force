import { SetMetadata } from '@nestjs/common';

import { PERMISSIONS_KEY } from '../auth.constants';

/** User must have ALL listed permissions. */
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
