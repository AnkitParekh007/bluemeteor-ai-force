import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';

import { ANY_PERMISSIONS_KEY } from '../auth.constants';
import { AnyPermissionsGuard } from '../guards/any-permissions.guard';

/** User must have at least one permission (or `system.admin`). */
export const RequireAnyPermissions = (...permissions: string[]) =>
	applyDecorators(SetMetadata(ANY_PERMISSIONS_KEY, permissions), UseGuards(AnyPermissionsGuard));
