import { GuildMember, PermissionFlagsBits } from 'discord.js';
import { configManager } from '../config/server-config';
import { permissionManager } from '../config/permission-manager';
import { logger } from './logger';
import { BotPermission } from '../types';

export class PermissionChecker {
  private static instance: PermissionChecker;

  public static getInstance(): PermissionChecker {
    if (!PermissionChecker.instance) {
      PermissionChecker.instance = new PermissionChecker();
    }
    return PermissionChecker.instance;
  }

  public async isAdmin(member: GuildMember): Promise<boolean> {
    try {
      // Check if member has administrator permission
      if (member.permissions.has(PermissionFlagsBits.Administrator)) {
        return true;
      }

      // Check if member has manage guild permission
      if (member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return true;
      }

      // Check if member is guild owner
      if (member.guild.ownerId === member.id) {
        return true;
      }

      // Check configured admin roles
      const serverConfig = await configManager.loadServerConfig(member.guild.id);
      if (serverConfig.adminRoles.length > 0) {
        const memberRoles = member.roles.cache.map(role => role.id);
        const hasAdminRole = serverConfig.adminRoles.some(roleId =>
          memberRoles.includes(roleId)
        );
        if (hasAdminRole) {
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Failed to check admin permission', error, {
        userId: member.id,
        guildId: member.guild.id
      });
      return false;
    }
  }

  public async canUseBot(member: GuildMember): Promise<boolean> {
    // Check if user is admin first
    const isAdmin = await this.isAdmin(member);
    if (isAdmin) return true;

    // Check new permission system
    return await permissionManager.hasPermission(
      member.guild.id,
      member,
      'use_bot'
    );
  }

  public async canManageConfig(member: GuildMember): Promise<boolean> {
    // Check if user is admin first
    const isAdmin = await this.isAdmin(member);
    if (isAdmin) return true;

    // Check new permission system
    return await permissionManager.hasPermission(
      member.guild.id,
      member,
      'manage_config'
    );
  }

  public async canRunAnalysis(member: GuildMember): Promise<boolean> {
    // Check if user is admin first
    const isAdmin = await this.isAdmin(member);
    if (isAdmin) return true;

    // Check new permission system
    return await permissionManager.hasPermission(
      member.guild.id,
      member,
      'run_analysis'
    );
  }

  public async canConsult(member: GuildMember): Promise<boolean> {
    // Check if user is admin first
    const isAdmin = await this.isAdmin(member);
    if (isAdmin) return true;

    // Check new permission system
    return await permissionManager.hasPermission(
      member.guild.id,
      member,
      'consult'
    );
  }

  public async canQuickAnalyze(member: GuildMember): Promise<boolean> {
    // Check if user is admin first
    const isAdmin = await this.isAdmin(member);
    if (isAdmin) return true;

    // Check new permission system
    return await permissionManager.hasPermission(
      member.guild.id,
      member,
      'quick_analyze'
    );
  }

  public async canManagePermissions(member: GuildMember): Promise<boolean> {
    // Check if user is admin first
    const isAdmin = await this.isAdmin(member);
    if (isAdmin) return true;

    // Check new permission system
    return await permissionManager.hasPermission(
      member.guild.id,
      member,
      'manage_permissions'
    );
  }

  public async canViewHelp(member: GuildMember): Promise<boolean> {
    // Check if user is admin first
    const isAdmin = await this.isAdmin(member);
    if (isAdmin) return true;

    // Check new permission system
    return await permissionManager.hasPermission(
      member.guild.id,
      member,
      'view_help'
    );
  }

  public async hasSpecificPermission(
    member: GuildMember,
    permission: BotPermission
  ): Promise<boolean> {
    // Check if user is admin first
    const isAdmin = await this.isAdmin(member);
    if (isAdmin) return true;

    // Check new permission system
    return await permissionManager.hasPermission(
      member.guild.id,
      member,
      permission
    );
  }

  public getPermissionErrorMessage(action: string): string {
    return `❌ **権限エラー**: ${action}を実行する権限がありません。\n\n` +
           `🔐 **必要な権限**:\n` +
           `• サーバー管理権限\n` +
           `• または設定された管理者ロール\n\n` +
           `💡 **解決方法**: サーバーの管理者に権限の付与を依頼してください。`;
  }

  public async logPermissionCheck(
    member: GuildMember,
    action: string,
    result: boolean
  ): Promise<void> {
    logger.info('Permission check', {
      userId: member.id,
      username: member.user.username,
      guildId: member.guild.id,
      action,
      result,
      isOwner: member.guild.ownerId === member.id,
      hasAdminPermission: member.permissions.has(PermissionFlagsBits.Administrator),
      hasManageGuildPermission: member.permissions.has(PermissionFlagsBits.ManageGuild)
    });
  }
}

export const permissionChecker = PermissionChecker.getInstance();