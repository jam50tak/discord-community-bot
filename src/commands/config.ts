import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ChannelType
} from 'discord.js';
import { configManager } from '../config/server-config';
import { apiKeyManager } from '../config/apikey-manager';
import { promptManager } from '../config/prompt-manager';
import { permissionManager } from '../config/permission-manager';
import { aiAnalyzerFactory } from '../analysis/ai-analyzer-factory';
import { permissionChecker } from '../utils/permission-checker';
import { logger } from '../utils/logger';
import { AIProvider, BotPermission } from '../types';

export const configCommand = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('ボットの設定を管理します')
    .addSubcommandGroup(group =>
      group
        .setName('ai')
        .setDescription('AI設定の管理')
        .addSubcommand(subcommand =>
          subcommand
            .setName('set')
            .setDescription('使用するAIプロバイダーを設定')
            .addStringOption(option =>
              option
                .setName('provider')
                .setDescription('AIプロバイダー')
                .setRequired(true)
                .addChoices(
                  { name: 'ChatGPT (OpenAI)', value: 'chatgpt' },
                  { name: 'Gemini (Google)', value: 'gemini' },
                  { name: 'Claude (Anthropic)', value: 'claude' }
                )
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('view')
            .setDescription('現在のAI設定を表示')
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('apikey')
        .setDescription('APIキーの管理')
        .addSubcommand(subcommand =>
          subcommand
            .setName('set')
            .setDescription('APIキーを設定')
            .addStringOption(option =>
              option
                .setName('provider')
                .setDescription('AIプロバイダー')
                .setRequired(true)
                .addChoices(
                  { name: 'ChatGPT (OpenAI)', value: 'chatgpt' },
                  { name: 'Gemini (Google)', value: 'gemini' },
                  { name: 'Claude (Anthropic)', value: 'claude' }
                )
            )
            .addStringOption(option =>
              option
                .setName('key')
                .setDescription('APIキー')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('APIキーを削除')
            .addStringOption(option =>
              option
                .setName('provider')
                .setDescription('AIプロバイダー')
                .setRequired(true)
                .addChoices(
                  { name: 'ChatGPT (OpenAI)', value: 'chatgpt' },
                  { name: 'Gemini (Google)', value: 'gemini' },
                  { name: 'Claude (Anthropic)', value: 'claude' }
                )
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('status')
            .setDescription('APIキーの設定状況を確認')
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('channels')
        .setDescription('分析対象チャンネルの管理')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('分析対象チャンネルを追加')
            .addChannelOption(option =>
              option
                .setName('channel')
                .setDescription('追加するチャンネル')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('分析対象チャンネルを削除')
            .addChannelOption(option =>
              option
                .setName('channel')
                .setDescription('削除するチャンネル')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('list')
            .setDescription('分析対象チャンネル一覧を表示')
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('prompt')
        .setDescription('分析プロンプトの管理')
        .addSubcommand(subcommand =>
          subcommand
            .setName('set')
            .setDescription('カスタムプロンプトを設定')
            .addStringOption(option =>
              option
                .setName('prompt')
                .setDescription('プロンプト内容')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('view')
            .setDescription('現在のプロンプトを表示')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('reset')
            .setDescription('デフォルトプロンプトに戻す')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('templates')
            .setDescription('プロンプトテンプレート一覧を表示')
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('permissions')
        .setDescription('権限設定の管理')
        .addSubcommand(subcommand =>
          subcommand
            .setName('view')
            .setDescription('現在の権限設定を表示')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('role-add')
            .setDescription('ロールに権限を付与')
            .addRoleOption(option =>
              option
                .setName('role')
                .setDescription('対象ロール')
                .setRequired(true)
            )
            .addStringOption(option =>
              option
                .setName('permissions')
                .setDescription('権限（カンマ区切り）')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('role-remove')
            .setDescription('ロールの権限を削除')
            .addRoleOption(option =>
              option
                .setName('role')
                .setDescription('対象ロール')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('user-add')
            .setDescription('ユーザーに個別権限を付与')
            .addUserOption(option =>
              option
                .setName('user')
                .setDescription('対象ユーザー')
                .setRequired(true)
            )
            .addStringOption(option =>
              option
                .setName('permissions')
                .setDescription('権限（カンマ区切り）')
                .setRequired(true)
            )
            .addBooleanOption(option =>
              option
                .setName('custom')
                .setDescription('カスタム設定（既存権限を上書き）')
                .setRequired(false)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('user-remove')
            .setDescription('ユーザーの個別権限を削除')
            .addUserOption(option =>
              option
                .setName('user')
                .setDescription('対象ユーザー')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('default')
            .setDescription('デフォルト権限を設定')
            .addStringOption(option =>
              option
                .setName('permissions')
                .setDescription('権限（カンマ区切り）')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('list-permissions')
            .setDescription('利用可能な権限一覧を表示')
        )
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({
        content: '❌ このコマンドはサーバー内でのみ使用できます。',
        ephemeral: true
      });
      return;
    }

    // Permission check
    const member = interaction.member;
    const hasPermission = await permissionChecker.canManageConfig(member as any);

    if (!hasPermission) {
      await interaction.reply({
        content: permissionChecker.getPermissionErrorMessage('設定管理'),
        ephemeral: true
      });
      return;
    }

    const group = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (group) {
        case 'ai':
          await this.handleAICommands(interaction, subcommand);
          break;
        case 'apikey':
          await this.handleAPIKeyCommands(interaction, subcommand);
          break;
        case 'channels':
          await this.handleChannelCommands(interaction, subcommand);
          break;
        case 'prompt':
          await this.handlePromptCommands(interaction, subcommand);
          break;
        case 'permissions':
          await this.handlePermissionCommands(interaction, subcommand);
          break;
        default:
          await interaction.reply({
            content: '❌ 無効なコマンドです。',
            ephemeral: true
          });
      }
    } catch (error) {
      logger.error(`Config command failed: ${group}.${subcommand}`, error);
      await interaction.reply({
        content: '❌ 設定の更新中にエラーが発生しました。',
        ephemeral: true
      });
    }
  },

  async handleAICommands(interaction: ChatInputCommandInteraction, subcommand: string): Promise<void> {
    const serverId = interaction.guildId!;

    switch (subcommand) {
      case 'set':
        const provider = interaction.options.getString('provider') as AIProvider;
        await configManager.setAIProvider(serverId, provider);

        const providerInfo = aiAnalyzerFactory.getProviderInfo(provider);
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('✅ AIプロバイダー設定完了')
          .setDescription(`**${providerInfo.name}** に設定しました`)
          .addFields(
            {
              name: '🤖 設定されたAI',
              value: providerInfo.name,
              inline: true
            },
            {
              name: '💰 コスト目安',
              value: providerInfo.costEstimate,
              inline: true
            },
            {
              name: '🔑 次のステップ',
              value: `APIキーを設定してください:\n\`/config apikey set provider:${provider} key:your_api_key\``,
              inline: false
            }
          );

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;

      case 'view':
        const currentProvider = await configManager.getAIProvider(serverId);
        const currentInfo = aiAnalyzerFactory.getProviderInfo(currentProvider);
        const hasAPIKey = await apiKeyManager.hasValidAPIKey(serverId, currentProvider);

        const viewEmbed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('🔧 現在のAI設定')
          .addFields(
            {
              name: '🤖 AIプロバイダー',
              value: currentInfo.name,
              inline: true
            },
            {
              name: '🔑 APIキー',
              value: hasAPIKey ? '✅ 設定済み' : '❌ 未設定',
              inline: true
            },
            {
              name: '📋 特徴',
              value: currentInfo.features.join('\n'),
              inline: false
            }
          );

        if (!hasAPIKey) {
          viewEmbed.addFields({
            name: '⚠️ 注意',
            value: `APIキーが設定されていません。\n\`/config apikey set provider:${currentProvider}\` で設定してください。`,
            inline: false
          });
        }

        await interaction.reply({ embeds: [viewEmbed], ephemeral: true });
        break;
    }
  },

  async handleAPIKeyCommands(interaction: ChatInputCommandInteraction, subcommand: string): Promise<void> {
    const serverId = interaction.guildId!;

    switch (subcommand) {
      case 'set':
        const provider = interaction.options.getString('provider') as AIProvider;
        const apiKey = interaction.options.getString('key')!;

        // Validate API key format
        if (apiKey.length < 10) {
          await interaction.reply({
            content: '❌ APIキーが短すぎます。正しいAPIキーを入力してください。',
            ephemeral: true
          });
          return;
        }

        await apiKeyManager.setAPIKey(serverId, provider, apiKey);

        const setEmbed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('✅ APIキー設定完了')
          .setDescription(`**${provider.toUpperCase()}** のAPIキーを設定しました`)
          .addFields({
            name: '🔒 セキュリティ',
            value: 'APIキーは暗号化されて安全に保存されています',
            inline: false
          });

        await interaction.reply({ embeds: [setEmbed], ephemeral: true });
        break;

      case 'remove':
        const removeProvider = interaction.options.getString('provider') as AIProvider;
        await apiKeyManager.removeAPIKey(serverId, removeProvider);

        await interaction.reply({
          content: `✅ **${removeProvider.toUpperCase()}** のAPIキーを削除しました。`,
          ephemeral: true
        });
        break;

      case 'status':
        const providers = aiAnalyzerFactory.getSupportedProviders();
        const statusFields = await Promise.all(
          providers.map(async (prov) => {
            const hasKey = await apiKeyManager.hasValidAPIKey(serverId, prov);
            const info = aiAnalyzerFactory.getProviderInfo(prov);
            return {
              name: info.name,
              value: hasKey ? '✅ 設定済み' : '❌ 未設定',
              inline: true
            };
          })
        );

        const statusEmbed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('🔑 APIキー設定状況')
          .addFields(statusFields);

        await interaction.reply({ embeds: [statusEmbed], ephemeral: true });
        break;
    }
  },

  async handleChannelCommands(interaction: ChatInputCommandInteraction, subcommand: string): Promise<void> {
    const serverId = interaction.guildId!;

    switch (subcommand) {
      case 'add':
        const addChannel = interaction.options.getChannel('channel')!;
        await configManager.addAnalyzedChannel(serverId, addChannel.id);

        await interaction.reply({
          content: `✅ <#${addChannel.id}> を分析対象チャンネルに追加しました。`,
          ephemeral: true
        });
        break;

      case 'remove':
        const removeChannel = interaction.options.getChannel('channel')!;
        await configManager.removeAnalyzedChannel(serverId, removeChannel.id);

        await interaction.reply({
          content: `✅ <#${removeChannel.id}> を分析対象チャンネルから削除しました。`,
          ephemeral: true
        });
        break;

      case 'list':
        const config = await configManager.loadServerConfig(serverId);

        if (config.analyzedChannels.length === 0) {
          await interaction.reply({
            content: '📋 分析対象チャンネルは設定されていません。\n`/config channels add` で追加してください。',
            ephemeral: true
          });
          return;
        }

        const channelList = config.analyzedChannels
          .map(channelId => `• <#${channelId}>`)
          .join('\n');

        const listEmbed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('📋 分析対象チャンネル一覧')
          .setDescription(channelList);

        await interaction.reply({ embeds: [listEmbed], ephemeral: true });
        break;
    }
  },

  async handlePromptCommands(interaction: ChatInputCommandInteraction, subcommand: string): Promise<void> {
    const serverId = interaction.guildId!;

    switch (subcommand) {
      case 'set':
        const prompt = interaction.options.getString('prompt')!;

        // Validate prompt
        const validation = promptManager.validatePrompt(prompt);
        if (!validation.isValid) {
          await interaction.reply({
            content: `❌ プロンプトに問題があります:\n${validation.errors.join('\n')}`,
            ephemeral: true
          });
          return;
        }

        await configManager.setCustomPrompt(serverId, prompt);

        const setEmbed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('✅ カスタムプロンプト設定完了')
          .setDescription('カスタムプロンプトを設定しました')
          .addFields({
            name: '📝 プロンプト内容（先頭100文字）',
            value: prompt.slice(0, 100) + (prompt.length > 100 ? '...' : ''),
            inline: false
          });

        if (validation.warnings.length > 0) {
          setEmbed.addFields({
            name: '⚠️ 警告',
            value: validation.warnings.join('\n'),
            inline: false
          });
        }

        await interaction.reply({ embeds: [setEmbed], ephemeral: true });
        break;

      case 'view':
        const currentPrompt = await configManager.getEffectivePrompt(serverId);
        const config = await configManager.loadServerConfig(serverId);

        const viewEmbed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('📝 現在のプロンプト設定')
          .addFields({
            name: '🔧 プロンプトタイプ',
            value: config.settings.useCustomPrompt ? 'カスタムプロンプト' : 'デフォルトプロンプト',
            inline: false
          });

        // Show first 1000 characters of prompt
        const promptPreview = currentPrompt.slice(0, 1000) + (currentPrompt.length > 1000 ? '...' : '');
        viewEmbed.addFields({
          name: '📋 プロンプト内容',
          value: `\`\`\`\n${promptPreview}\n\`\`\``,
          inline: false
        });

        await interaction.reply({ embeds: [viewEmbed], ephemeral: true });
        break;

      case 'reset':
        await configManager.resetPrompt(serverId);

        await interaction.reply({
          content: '✅ プロンプトをデフォルトに戻しました。',
          ephemeral: true
        });
        break;

      case 'templates':
        const templates = promptManager.getPromptTemplates();
        const templateFields = Object.entries(templates).map(([key, template]) => ({
          name: `📋 ${key}`,
          value: template.slice(0, 100) + '...',
          inline: false
        }));

        const templatesEmbed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('📚 プロンプトテンプレート')
          .setDescription('以下のテンプレートを参考にカスタムプロンプトを作成できます')
          .addFields(templateFields);

        await interaction.reply({ embeds: [templatesEmbed], ephemeral: true });
        break;
    }
  },

  async handlePermissionCommands(
    interaction: ChatInputCommandInteraction,
    subcommand: string
  ): Promise<void> {
    const serverId = interaction.guild!.id;

    switch (subcommand) {
      case 'view':
        const config = await permissionManager.getPermissionConfig(serverId);

        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('🔐 現在の権限設定')
          .setDescription('サーバーの権限設定状況');

        // デフォルト権限
        if (config.defaultPermissions.length > 0) {
          embed.addFields({
            name: '🌟 デフォルト権限',
            value: config.defaultPermissions.map(p =>
              `• ${permissionManager.getPermissionDescription(p)}`
            ).join('\n'),
            inline: false
          });
        }

        // ロール権限
        if (config.rolePermissions.length > 0) {
          embed.addFields({
            name: '👥 ロール権限',
            value: config.rolePermissions
              .filter(rp => rp.enabled)
              .map(rp => `**${rp.roleName}**\n${rp.permissions.map(p =>
                `• ${permissionManager.getPermissionDescription(p)}`
              ).join('\n')}`)
              .join('\n\n'),
            inline: false
          });
        }

        // ユーザー権限
        if (config.userPermissions.length > 0) {
          embed.addFields({
            name: '👤 個別ユーザー権限',
            value: config.userPermissions
              .filter(up => up.enabled)
              .map(up => `**${up.username}** ${up.isCustom ? '(カスタム)' : '(継承)'}\n${up.permissions.map(p =>
                `• ${permissionManager.getPermissionDescription(p)}`
              ).join('\n')}`)
              .join('\n\n'),
            inline: false
          });
        }

        // 管理者限定機能
        embed.addFields({
          name: '🛡️ 管理者限定機能',
          value: config.adminOnlyPermissions.map(p =>
            `• ${permissionManager.getPermissionDescription(p)}`
          ).join('\n'),
          inline: false
        });

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;

      case 'role-add':
        const role = interaction.options.getRole('role', true);
        const rolePermissions = interaction.options.getString('permissions', true);

        const rolePerms = this.parsePermissions(rolePermissions);
        if (rolePerms.length === 0) {
          await interaction.reply({
            content: '❌ 有効な権限が指定されていません。',
            ephemeral: true
          });
          return;
        }

        await permissionManager.setRolePermissions(
          serverId,
          role.id,
          role.name,
          rolePerms
        );

        await interaction.reply({
          content: `✅ ロール **${role.name}** に権限を設定しました。`,
          ephemeral: true
        });
        break;

      case 'role-remove':
        const removeRole = interaction.options.getRole('role', true);

        await permissionManager.removeRolePermissions(serverId, removeRole.id);

        await interaction.reply({
          content: `✅ ロール **${removeRole.name}** の権限を削除しました。`,
          ephemeral: true
        });
        break;

      case 'user-add':
        const user = interaction.options.getUser('user', true);
        const userPermissions = interaction.options.getString('permissions', true);
        const isCustom = interaction.options.getBoolean('custom') ?? false;

        const userPerms = this.parsePermissions(userPermissions);
        if (userPerms.length === 0) {
          await interaction.reply({
            content: '❌ 有効な権限が指定されていません。',
            ephemeral: true
          });
          return;
        }

        await permissionManager.setUserPermissions(
          serverId,
          user.id,
          user.username,
          userPerms,
          isCustom
        );

        await interaction.reply({
          content: `✅ ユーザー **${user.username}** に${isCustom ? 'カスタム' : '追加'}権限を設定しました。`,
          ephemeral: true
        });
        break;

      case 'user-remove':
        const removeUser = interaction.options.getUser('user', true);

        await permissionManager.removeUserPermissions(serverId, removeUser.id);

        await interaction.reply({
          content: `✅ ユーザー **${removeUser.username}** の個別権限を削除しました。`,
          ephemeral: true
        });
        break;

      case 'default':
        const defaultPermissions = interaction.options.getString('permissions', true);

        const defaultPerms = this.parsePermissions(defaultPermissions);
        if (defaultPerms.length === 0) {
          await interaction.reply({
            content: '❌ 有効な権限が指定されていません。',
            ephemeral: true
          });
          return;
        }

        await permissionManager.setDefaultPermissions(serverId, defaultPerms);

        await interaction.reply({
          content: '✅ デフォルト権限を設定しました。',
          ephemeral: true
        });
        break;

      case 'list-permissions':
        const allPermissions = permissionManager.getAllPermissions();

        const permissionsEmbed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('📋 利用可能な権限一覧')
          .setDescription('以下の権限を設定できます：');

        permissionsEmbed.addFields({
          name: '権限',
          value: allPermissions.map(perm =>
            `\`${perm}\` - ${permissionManager.getPermissionDescription(perm)}`
          ).join('\n'),
          inline: false
        });

        permissionsEmbed.addFields({
          name: '使用例',
          value: '```\n' +
            '/config permissions role-add role:@メンバー permissions:use_bot,run_analysis\n' +
            '/config permissions user-add user:@ユーザー permissions:consult custom:true\n' +
            '/config permissions default permissions:view_help\n' +
            '```',
          inline: false
        });

        await interaction.reply({ embeds: [permissionsEmbed], ephemeral: true });
        break;
    }
  },

  parsePermissions(permissionString: string): BotPermission[] {
    const validPermissions = permissionManager.getAllPermissions();
    const inputPermissions = permissionString
      .split(',')
      .map(p => p.trim() as BotPermission)
      .filter(p => validPermissions.includes(p));

    return inputPermissions;
  }
};