import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';
import { CicdReaderService } from '../../internal-tools/services/cicd-reader.service';
import type { ConnectorHealth } from '../models/connector.model';
import type { CicdAnalysis, CicdFileContent, CicdFileSummary } from '../models/cicd-connector.model';
import { MOCK_CICD_ANALYSIS } from './connector-mock-data';

@Injectable()
export class CicdConnectorService {
	constructor(
		private readonly cfg: AppConfigService,
		private readonly reader: CicdReaderService,
	) {}

	isEnabled(): boolean {
		return this.cfg.enableCicdConnector && this.cfg.enableConnectors;
	}

	async healthCheck(): Promise<ConnectorHealth> {
		const now = new Date().toISOString();
		if (!this.cfg.enableConnectors) {
			return { connectorId: 'cicd', status: 'disabled', message: 'Connectors disabled', checkedAt: now };
		}
		if (!this.cfg.enableCicdConnector) {
			return { connectorId: 'cicd', status: 'disabled', message: 'CI/CD connector disabled', checkedAt: now };
		}
		if (!this.cfg.enableCicdReader) {
			return {
				connectorId: 'cicd',
				status: this.cfg.enableConnectorMockFallback ? 'enabled' : 'missing_config',
				message: this.cfg.enableConnectorMockFallback ? 'CI/CD reader disabled — mock analysis available in tools' : 'Internal CI/CD reader disabled',
				checkedAt: now,
				metadata: { provider: this.cfg.cicdConnectorProvider },
			};
		}
		return {
			connectorId: 'cicd',
			status: 'healthy',
			message: `Local CI/CD reader (${this.cfg.cicdConnectorProvider})`,
			checkedAt: now,
			metadata: { provider: this.cfg.cicdConnectorProvider },
		};
	}

	async listPipelineFiles(): Promise<CicdFileSummary[]> {
		if (!this.cfg.enableCicdReader && this.cfg.enableConnectorMockFallback) {
			return this.cfg.cicdAllowedFiles.map((p) => {
				const name = p.split('/').pop() ?? p;
				const ext = name.includes('.') ? `.${name.split('.').pop()}` : '';
				return { path: p, name, extension: ext, size: 0 };
			});
		}
		return this.reader.listCicdFiles();
	}

	async readPipelineFile(filePath: string): Promise<CicdFileContent> {
		if (!this.cfg.enableCicdReader && this.cfg.enableConnectorMockFallback) {
			const content = `# Mock CI file: ${filePath}\n# Configure ENABLE_CICD_READER and repository paths for live content.\n`;
			return {
				path: filePath,
				content,
				language: filePath.endsWith('.yml') || filePath.endsWith('.yaml') ? 'yaml' : 'text',
				size: Buffer.byteLength(content, 'utf8'),
			};
		}
		return this.reader.readCicdFile(filePath);
	}

	async analyzePipelineConfig(): Promise<CicdAnalysis> {
		if (!this.cfg.enableCicdReader && this.cfg.enableConnectorMockFallback) return MOCK_CICD_ANALYSIS;
		return this.reader.analyzeCicdConfig();
	}
}
