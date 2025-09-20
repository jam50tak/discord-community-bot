import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';

export class Database {
  private static instance: Database;
  private pool: Pool;

  private constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  public async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      logger.error('Database query failed', error, { text, params });
      throw error;
    }
  }

  public async initializeSchema(): Promise<void> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');

      // Server configurations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS server_configs (
          server_id VARCHAR(255) PRIMARY KEY,
          server_name VARCHAR(255),
          ai_provider VARCHAR(50) DEFAULT 'claude',
          custom_prompt TEXT,
          analyzed_channels TEXT[] DEFAULT '{}',
          rules TEXT[] DEFAULT '{}',
          client_requirements TEXT[] DEFAULT '{}',
          admin_roles TEXT[] DEFAULT '{}',
          use_custom_prompt BOOLEAN DEFAULT false,
          default_analysis_period VARCHAR(50) DEFAULT 'today',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Permission configurations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS permission_configs (
          server_id VARCHAR(255) PRIMARY KEY,
          role_permissions JSONB DEFAULT '[]',
          user_permissions JSONB DEFAULT '[]',
          default_permissions TEXT[] DEFAULT '{"view_help"}',
          admin_only_permissions TEXT[] DEFAULT '{"manage_config", "manage_permissions"}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for better performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_server_configs_server_id ON server_configs(server_id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_permission_configs_server_id ON permission_configs(server_id)
      `);

      await client.query('COMMIT');
      logger.info('Database schema initialized successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to initialize database schema', error);
      throw error;
    } finally {
      client.release();
    }
  }

  public async isConnected(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database connection check failed', error);
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database connection pool closed');
  }

  // Fallback methods for when database is not available
  public isAvailable(): boolean {
    return !!process.env.DATABASE_URL;
  }
}

export const database = Database.getInstance();