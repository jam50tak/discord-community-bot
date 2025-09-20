import { promises as fs } from 'fs';
import { join } from 'path';
import { GuildMember } from 'discord.js';
import {
  PermissionConfig,
  BotPermission
} from '../types';
import { logger } from '../utils/logger';

export class PermissionManager {
  private static instance: PermissionManager;
  private readonly permissionFile: string;

  private constructor() {
    this.permissionFile = join(process.cwd(), 'config', 'permissions.json');
  }

  public static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  public async getPermissionConfig(serverId: string): Promise<PermissionConfig> {
    try {
      const allConfigs = await this.loadPermissionConfigs();

      if (!allConfigs[serverId]) {
        // デフォルト設定を作成
        allConfigs[serverId] = this.createDefaultPermissionConfig();
        await this.savePermissionConfigs(allConfigs);
      }

      return allConfigs[serverId];
    } catch (error) {
      logger.error('Failed to get permission config', error, { serverId });
      return this.createDefaultPermissionConfig();
    }
  }

  public async setRolePermissions(
    serverId: string,
    roleId: string,
    roleName: string,
    permissions: BotPermission[]
  ): Promise<void> {
    try {
      const allConfigs = await this.loadPermissionConfigs();
      const config = allConfigs[serverId] || this.createDefaultPermissionConfig();

      // 既存のロール権限を更新または新規追加
      const existingIndex = config.rolePermissions.findIndex(rp => rp.roleId === roleId);

      if (existingIndex >= 0) {
        config.rolePermissions[existingIndex] = {
          roleId,
          roleName,
          permissions,
          enabled: true
        };
      } else {
        config.rolePermissions.push({
          roleId,
          roleName,
          permissions,
          enabled: true
        });
      }

      allConfigs[serverId] = config;
      await this.savePermissionConfigs(allConfigs);

      logger.info(`Role permissions updated for ${roleName}`, {
        serverId,
        roleId,
        permissions
      });
    } catch (error) {
      logger.error('Failed to set role permissions', error, {
        serverId,
        roleId,
        permissions
      });
      throw error;
    }
  }

  public async setUserPermissions(
    serverId: string,
    userId: string,
    username: string,
    permissions: BotPermission[],
    isCustom: boolean = true
  ): Promise<void> {
    try {
      const allConfigs = await this.loadPermissionConfigs();
      const config = allConfigs[serverId] || this.createDefaultPermissionConfig();

      // 既存のユーザー権限を更新または新規追加
      const existingIndex = config.userPermissions.findIndex(up => up.userId === userId);

      if (existingIndex >= 0) {
        config.userPermissions[existingIndex] = {
          userId,
          username,
          permissions,
          enabled: true,
          isCustom
        };
      } else {
        config.userPermissions.push({
          userId,
          username,
          permissions,
          enabled: true,
          isCustom
        });
      }

      allConfigs[serverId] = config;
      await this.savePermissionConfigs(allConfigs);

      logger.info(`User permissions updated for ${username}`, {
        serverId,
        userId,
        permissions,
        isCustom
      });
    } catch (error) {
      logger.error('Failed to set user permissions', error, {
        serverId,
        userId,
        permissions
      });
      throw error;
    }
  }

  public async removeRolePermissions(serverId: string, roleId: string): Promise<void> {
    try {
      const allConfigs = await this.loadPermissionConfigs();
      const config = allConfigs[serverId] || this.createDefaultPermissionConfig();

      config.rolePermissions = config.rolePermissions.filter(rp => rp.roleId !== roleId);

      allConfigs[serverId] = config;
      await this.savePermissionConfigs(allConfigs);

      logger.info(`Role permissions removed`, { serverId, roleId });
    } catch (error) {
      logger.error('Failed to remove role permissions', error, { serverId, roleId });
      throw error;
    }
  }

  public async removeUserPermissions(serverId: string, userId: string): Promise<void> {
    try {
      const allConfigs = await this.loadPermissionConfigs();
      const config = allConfigs[serverId] || this.createDefaultPermissionConfig();

      config.userPermissions = config.userPermissions.filter(up => up.userId !== userId);

      allConfigs[serverId] = config;
      await this.savePermissionConfigs(allConfigs);

      logger.info(`User permissions removed`, { serverId, userId });
    } catch (error) {
      logger.error('Failed to remove user permissions', error, { serverId, userId });
      throw error;
    }
  }

  public async setDefaultPermissions(
    serverId: string,
    permissions: BotPermission[]
  ): Promise<void> {
    try {
      const allConfigs = await this.loadPermissionConfigs();
      const config = allConfigs[serverId] || this.createDefaultPermissionConfig();

      config.defaultPermissions = permissions;

      allConfigs[serverId] = config;
      await this.savePermissionConfigs(allConfigs);

      logger.info(`Default permissions updated`, { serverId, permissions });
    } catch (error) {
      logger.error('Failed to set default permissions', error, { serverId, permissions });
      throw error;
    }
  }

  public async getUserEffectivePermissions(
    serverId: string,
    member: GuildMember
  ): Promise<BotPermission[]> {
    try {
      const config = await this.getPermissionConfig(serverId);
      const permissions = new Set<BotPermission>();

      // 1. デフォルト権限を追加
      config.defaultPermissions.forEach(perm => permissions.add(perm));

      // 2. ロール権限を追加
      const memberRoleIds = member.roles.cache.map(role => role.id);
      config.rolePermissions
        .filter(rp => rp.enabled && memberRoleIds.includes(rp.roleId))
        .forEach(rp => {
          rp.permissions.forEach(perm => permissions.add(perm));
        });

      // 3. ユーザー個別権限を追加（カスタム設定がある場合は優先）
      const userPermission = config.userPermissions.find(
        up => up.userId === member.id && up.enabled
      );

      if (userPermission) {
        if (userPermission.isCustom) {
          // カスタム設定の場合は既存権限をクリアして個別権限のみ適用
          permissions.clear();
          userPermission.permissions.forEach(perm => permissions.add(perm));
        } else {
          // 継承設定の場合は追加
          userPermission.permissions.forEach(perm => permissions.add(perm));
        }
      }

      return Array.from(permissions);
    } catch (error) {
      logger.error('Failed to get user effective permissions', error, {
        serverId,
        userId: member.id
      });
      return [];
    }
  }

  public async hasPermission(
    serverId: string,
    member: GuildMember,
    permission: BotPermission
  ): Promise<boolean> {
    try {
      const config = await this.getPermissionConfig(serverId);

      // 管理者限定権限のチェック
      if (config.adminOnlyPermissions.includes(permission)) {
        return await this.isAdmin(member);
      }

      const effectivePermissions = await this.getUserEffectivePermissions(serverId, member);
      return effectivePermissions.includes(permission);
    } catch (error) {
      logger.error('Failed to check permission', error, {
        serverId,
        userId: member.id,
        permission
      });
      return false;
    }
  }

  public getPermissionDescription(permission: BotPermission): string {
    const descriptions: Record<BotPermission, string> = {
      'use_bot': 'ボットの基本機能を使用',
      'run_analysis': '会話分析機能を実行',
      'quick_analyze': 'クイック分析を実行',
      'consult': '相談機能を使用',
      'manage_config': 'ボット設定を変更',
      'manage_permissions': '権限設定を管理',
      'view_help': 'ヘルプを表示'
    };

    return descriptions[permission] || permission;
  }

  public getAllPermissions(): BotPermission[] {
    return [
      'use_bot',
      'run_analysis',
      'quick_analyze',
      'consult',
      'manage_config',
      'manage_permissions',
      'view_help'
    ];
  }

  private async isAdmin(member: GuildMember): Promise<boolean> {
    // 既存の管理者チェックロジックを再利用
    const { permissionChecker } = await import('../utils/permission-checker');
    return await permissionChecker.isAdmin(member);
  }

  private createDefaultPermissionConfig(): PermissionConfig {
    return {
      rolePermissions: [],
      userPermissions: [],
      defaultPermissions: ['view_help'], // デフォルトはヘルプのみ
      adminOnlyPermissions: ['manage_config', 'manage_permissions'] // 管理者限定
    };
  }

  private async loadPermissionConfigs(): Promise<Record<string, PermissionConfig>> {
    try {
      const data = await fs.readFile(this.permissionFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return {};
      }
      logger.error('Failed to load permission configs', error);
      throw error;
    }
  }

  private async savePermissionConfigs(configs: Record<string, PermissionConfig>): Promise<void> {
    try {
      await this.ensureConfigDirectory();
      const data = JSON.stringify(configs, null, 2);
      await fs.writeFile(this.permissionFile, data, 'utf-8');
    } catch (error) {
      logger.error('Failed to save permission configs', error);
      throw error;
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

export const permissionManager = PermissionManager.getInstance();