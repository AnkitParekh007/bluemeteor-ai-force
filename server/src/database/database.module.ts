import { Global, Module } from '@nestjs/common';

import { ProvidersModule } from '../providers/providers.module';
import { PrismaService } from './prisma.service';

@Global()
@Module({
	imports: [ProvidersModule],
	providers: [PrismaService],
	exports: [PrismaService],
})
export class DatabaseModule {}
