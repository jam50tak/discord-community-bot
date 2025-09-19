import { GuildMember, PermissionFlagsBits } from 'discord.js';
import { configManager } from '../config/server-config';
import { logger } from './logger';

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
    // For now, only admins can use the bot
    return this.isAdmin(member);
  }

  public async canManageConfig(member: GuildMember): Promise<boolean> {
    return this.isAdmin(member);
  }

  public async canRunAnalysis(member: GuildMember): Promise<boolean> {
    return this.isAdmin(member);
  }

  public async canConsult(member: GuildMember): Promise<boolean> {
    return this.isAdmin(member);
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