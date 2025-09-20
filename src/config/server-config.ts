import { promises as fs } from 'fs';
import { join } from 'path';
import { ServerConfig, AIProvider } from '../types';
import { logger } from '../utils/logger';
import { database } from '../db/database';

export class ConfigManager {
  private static instance: ConfigManager;
  private readonly configDir: string;

  private constructor() {
    this.configDir = join(process.cwd(), 'config', 'servers');
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public async loadServerConfig(serverId: string): Promise<ServerConfig> {
    try {
      // Try database first if available
      if (database.isAvailable()) {
        const config = await this.loadConfigFromDatabase(serverId);
        if (config) {
          return config;
        }
      }

      // Fallback to file system
      const configPath = join(this.configDir, `${serverId}.json`);
      const configData = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configData) as ServerConfig;

      // Validate config structure
      this.validateConfig(config);

      // Migrate to database if available
      if (database.isAvailable()) {
        await this.saveConfigToDatabase(config);
        logger.info(`Migrated server config ${serverId} to database`);
      }

      return config;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        logger.info(`Creating default config for server ${serverId}`);
        const defaultConfig = this.createDefaultConfig(serverId);

        // Save to database if available
        if (database.isAvailable()) {
          await this.saveConfigToDatabase(defaultConfig);
        }

        return defaultConfig;
      }
      logger.error(`Failed to load config for server ${serverId}`, error);
      throw error;
    }
  }

  public async saveServerConfig(config: ServerConfig): Promise<void> {
    try {
      // Save to database if available
      if (database.isAvailable()) {
        await this.saveConfigToDatabase(config);
        logger.info(`Saved config for server ${config.serverId} to database`);
        return;
      }

      // Fallback to file system
      await this.ensureConfigDirectory();

      const configPath = join(this.configDir, `${config.serverId}.json`);
      const configData = JSON.stringify(config, null, 2);
      await fs.writeFile(configPath, configData, 'utf-8');

      logger.info(`Saved config for server ${config.serverId} to file`);
    } catch (error) {
      logger.error(`Failed to save config for server ${config.serverId}`, error);
      throw error;
    }
  }

  public async setAIProvider(serverId: string, provider: AIProvider): Promise<void> {
    const config = await this.loadServerConfig(serverId);
    config.aiProvider = provider;
    await this.saveServerConfig(config);
  }

  public async getAIProvider(serverId: string): Promise<AIProvider> {
    const config = await this.loadServerConfig(serverId);
    return config.aiProvider;
  }

  public async setCustomPrompt(serverId: string, prompt: string): Promise<void> {
    const config = await this.loadServerConfig(serverId);
    config.customPrompt = prompt;
    config.settings.useCustomPrompt = true;
    await this.saveServerConfig(config);
  }

  public async getEffectivePrompt(serverId: string): Promise<string> {
    const config = await this.loadServerConfig(serverId);

    if (config.settings.useCustomPrompt && config.customPrompt) {
      return config.customPrompt;
    }

    return this.getDefaultPrompt();
  }

  public async resetPrompt(serverId: string): Promise<void> {
    const config = await this.loadServerConfig(serverId);
    config.customPrompt = undefined;
    config.settings.useCustomPrompt = false;
    await this.saveServerConfig(config);
  }

  public async addAnalyzedChannel(serverId: string, channelId: string): Promise<void> {
    const config = await this.loadServerConfig(serverId);

    if (!config.analyzedChannels.includes(channelId)) {
      config.analyzedChannels.push(channelId);
      await this.saveServerConfig(config);
    }
  }

  public async removeAnalyzedChannel(serverId: string, channelId: string): Promise<void> {
    const config = await this.loadServerConfig(serverId);

    const index = config.analyzedChannels.indexOf(channelId);
    if (index > -1) {
      config.analyzedChannels.splice(index, 1);
      await this.saveServerConfig(config);
    }
  }

  public async setRules(serverId: string, rules: string[]): Promise<void> {
    const config = await this.loadServerConfig(serverId);
    config.rules = rules;
    await this.saveServerConfig(config);
  }

  public async addAdminRole(serverId: string, roleId: string): Promise<void> {
    const config = await this.loadServerConfig(serverId);

    if (!config.adminRoles.includes(roleId)) {
      config.adminRoles.push(roleId);
      await this.saveServerConfig(config);
    }
  }

  private createDefaultConfig(serverId: string): ServerConfig {
    return {
      serverId,
      serverName: '',
      analyzedChannels: [],
      aiProvider: 'claude',
      customPrompt: undefined,
      rules: [],
      clientRequirements: [],
      adminRoles: [],
      permissions: {
        rolePermissions: [],
        userPermissions: [],
        defaultPermissions: ['view_help'],
        adminOnlyPermissions: ['manage_config', 'manage_permissions']
      },
      settings: {
        defaultAnalysisPeriod: 'today',
        useCustomPrompt: false
      }
    };
  }

  private validateConfig(config: any): asserts config is ServerConfig {
    if (!config.serverId || typeof config.serverId !== 'string') {
      throw new Error('Invalid config: serverId is required');
    }

    if (!Array.isArray(config.analyzedChannels)) {
      throw new Error('Invalid config: analyzedChannels must be an array');
    }

    if (!['chatgpt', 'gemini', 'claude'].includes(config.aiProvider)) {
      throw new Error('Invalid config: aiProvider must be chatgpt, gemini, or claude');
    }

    if (!config.settings || typeof config.settings !== 'object') {
      throw new Error('Invalid config: settings object is required');
    }
  }

  private async ensureConfigDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.configDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create config directory', error);
      throw error;
    }
  }

  private getDefaultPrompt(): string {
    return `あなたはDiscordコミュニティの分析専門家です。提供された会話データを分析し、以下の観点から包括的なレポートを作成してください：

1. **コミュニティ活動状況**
   - メッセージ数、アクティブユーザー数
   - チャンネル別の活動度
   - 時間帯別の分布

2. **会話の傾向と話題**
   - 主要な話題やトレンド
   - ユーザーの関心事
   - 盛り上がった議論

3. **感情分析**
   - 全体的な雰囲気（ポジティブ/ネガティブ）
   - ユーザー間の関係性
   - 潜在的な問題の兆候

4. **改善提案**
   - エンゲージメント向上策
   - コミュニティ運営の改善点
   - 注意すべき点

分析は具体的で建設的な内容にし、日本語で回答してください。`;
  }

  private async loadConfigFromDatabase(serverId: string): Promise<ServerConfig | null> {
    try {
      const result = await database.query(
        'SELECT * FROM server_configs WHERE server_id = $1',
        [serverId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        serverId: row.server_id,
        serverName: row.server_name || '',
        aiProvider: row.ai_provider || 'claude',
        customPrompt: row.custom_prompt || undefined,
        analyzedChannels: row.analyzed_channels || [],
        rules: row.rules || [],
        clientRequirements: row.client_requirements || [],
        adminRoles: row.admin_roles || [],
        permissions: {
          rolePermissions: [],
          userPermissions: [],
          defaultPermissions: ['view_help'],
          adminOnlyPermissions: ['manage_config', 'manage_permissions']
        },
        settings: {
          useCustomPrompt: row.use_custom_prompt || false,
          defaultAnalysisPeriod: row.default_analysis_period || 'today'
        }
      };
    } catch (error) {
      logger.error(`Failed to load config from database for server ${serverId}`, error);
      return null;
    }
  }

  private async saveConfigToDatabase(config: ServerConfig): Promise<void> {
    try {
      await database.query(`
        INSERT INTO server_configs (
          server_id, server_name, ai_provider, custom_prompt,
          analyzed_channels, rules, client_requirements, admin_roles,
          use_custom_prompt, default_analysis_period, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
        ON CONFLICT (server_id) DO UPDATE SET
          server_name = EXCLUDED.server_name,
          ai_provider = EXCLUDED.ai_provider,
          custom_prompt = EXCLUDED.custom_prompt,
          analyzed_channels = EXCLUDED.analyzed_channels,
          rules = EXCLUDED.rules,
          client_requirements = EXCLUDED.client_requirements,
          admin_roles = EXCLUDED.admin_roles,
          use_custom_prompt = EXCLUDED.use_custom_prompt,
          default_analysis_period = EXCLUDED.default_analysis_period,
          updated_at = CURRENT_TIMESTAMP
      `, [
        config.serverId,
        config.serverName,
        config.aiProvider,
        config.customPrompt,
        config.analyzedChannels,
        config.rules,
        config.clientRequirements,
        config.adminRoles,
        config.settings.useCustomPrompt,
        config.settings.defaultAnalysisPeriod
      ]);
    } catch (error) {
      logger.error(`Failed to save config to database for server ${config.serverId}`, error);
      throw error;
    }
  }
}

export const configManager = ConfigManager.getInstance();