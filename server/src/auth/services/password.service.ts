import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { AppConfigService } from '../../config/app-config.service';

@Injectable()
export class PasswordService {
	constructor(private readonly cfg: AppConfigService) {}

	async hash(plain: string): Promise<string> {
		return bcrypt.hash(plain, this.cfg.bcryptSaltRounds);
	}

	async verify(plain: string, hash: string): Promise<boolean> {
		return bcrypt.compare(plain, hash);
	}
}
