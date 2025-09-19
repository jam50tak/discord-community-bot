import { promises as fs } from 'fs';
import { join } from 'path';
import { createCipher, createDecipher } from 'crypto';
import { AIProvider } from '../types';
import { logger } from '../utils/logger';

interface APIKeyStorage {
  [serverId: string]: {
    [provider in AIProvider]?: string;
  };
}

export class APIKeyManager {
  private static instance: APIKeyManager;
  private readonly keyFile: string;
  private readonly encryptionKey: string;

  private constructor() {
    this.keyFile = join(process.cwd(), 'config', 'apikeys.enc');
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-this';

    if (this.encryptionKey === 'default-encryption-key-change-this') {
      logger.warn('Using default encryption key. Please set ENCRYPTION_KEY environment variable.');
    }
  }

  public static getInstance(): APIKeyManager {
    if (!APIKeyManager.instance) {
      APIKeyManager.instance = new APIKeyManager();
    }
    return APIKeyManager.instance;
  }

  public async setAPIKey(
    serverId: string,
    provider: AIProvider,
    apiKey: string
  ): Promise<void> {
    try {
      const storage = await this.loadAPIKeys();

      if (!storage[serverId]) {
        storage[serverId] = {};
      }

      storage[serverId][provider] = this.encrypt(apiKey);
      await this.saveAPIKeys(storage);

      logger.info(`API key set for ${provider} in server ${serverId}`);
    } catch (error) {
      logger.error(`Failed to set API key for ${provider} in server ${serverId}`, error);
      throw error;
    }
  }

  public async getAPIKey(
    serverId: string,
    provider: AIProvider
  ): Promise<string | null> {
    try {
      const storage = await this.loadAPIKeys();

      if (!storage[serverId] || !storage[serverId][provider]) {
        return null;
      }

      const encryptedKey = storage[serverId][provider]!;
      return this.decrypt(encryptedKey);
    } catch (error) {
      logger.error(`Failed to get API key for ${provider} in server ${serverId}`, error);
      return null;
    }
  }

  public async removeAPIKey(
    serverId: string,
    provider: AIProvider
  ): Promise<void> {
    try {
      const storage = await this.loadAPIKeys();

      if (storage[serverId] && storage[serverId][provider]) {
        delete storage[serverId][provider];

        // Remove server entry if no keys left
        if (Object.keys(storage[serverId]).length === 0) {
          delete storage[serverId];
        }

        await this.saveAPIKeys(storage);
        logger.info(`API key removed for ${provider} in server ${serverId}`);
      }
    } catch (error) {
      logger.error(`Failed to remove API key for ${provider} in server ${serverId}`, error);
      throw error;
    }
  }

  public async hasValidAPIKey(
    serverId: string,
    provider: AIProvider
  ): Promise<boolean> {
    const apiKey = await this.getAPIKey(serverId, provider);
    return apiKey !== null && apiKey.length > 0;
  }

  public async listConfiguredProviders(serverId: string): Promise<AIProvider[]> {
    try {
      const storage = await this.loadAPIKeys();

      if (!storage[serverId]) {
        return [];
      }

      return Object.keys(storage[serverId]) as AIProvider[];
    } catch (error) {
      logger.error(`Failed to list providers for server ${serverId}`, error);
      return [];
    }
  }

  private async loadAPIKeys(): Promise<APIKeyStorage> {
    try {
      const encryptedData = await fs.readFile(this.keyFile, 'utf-8');
      const decryptedData = this.decrypt(encryptedData);
      return JSON.parse(decryptedData) as APIKeyStorage;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // File doesn't exist, return empty storage
        return {};
      }
      logger.error('Failed to load API keys', error);
      throw error;
    }
  }

  private async saveAPIKeys(storage: APIKeyStorage): Promise<void> {
    try {
      // Ensure config directory exists
      await this.ensureConfigDirectory();

      const jsonData = JSON.stringify(storage);
      const encryptedData = this.encrypt(jsonData);
      await fs.writeFile(this.keyFile, encryptedData, 'utf-8');
    } catch (error) {
      logger.error('Failed to save API keys', error);
      throw error;
    }
  }

  private encrypt(data: string): string {
    try {
      const cipher = createCipher('aes-256-cbc', this.encryptionKey);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      logger.error('Failed to encrypt data', error);
      throw new Error('Encryption failed');
    }
  }

  private decrypt(encryptedData: string): string {
    try {
      const decipher = createDecipher('aes-256-cbc', this.encryptionKey);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt data', error);
      throw new Error('Decryption failed');
    }
  }

  private async ensureConfigDirectory(): Promise<void> {
    try {
      const configDir = join(process.cwd(), 'config');
      await fs.mkdir(configDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create config directory', error);
      throw error;
    }
  }
}

export const apiKeyManager = APIKeyManager.getInstance();