import { SetMetadata } from '@nestjs/common';

import { IS_PUBLIC_KEY } from '../auth.constants';

/** Marks route as accessible without JWT (health, login, refresh). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
