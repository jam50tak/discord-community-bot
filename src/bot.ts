import { Client, GatewayIntentBits, Events, Collection, REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './utils/error-handler';
import { database } from './db/database';

// Import commands
import { analyzeCommand } from './commands/analyze';
import { quickAnalyzeCommand } from './commands/quick-analyze';
import { configCommand } from './commands/config';
import { consultCommand } from './commands/consult';
import { helpCommand } from './commands/help';

config();

export class DiscordBot {
  private client: Client;
  private commands: Collection<string, any>;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
      ]
    });

    this.commands = new Collection();
    this.setupCommands();
    this.setupEventHandlers();
  }

  private setupCommands(): void {
    const commands = [
      analyzeCommand,
      quickAnalyzeCommand,
      configCommand,
      consultCommand,
      helpCommand
    ];

    for (const command of commands) {
      this.commands.set(command.data.name, command);
    }
  }

  private setupEventHandlers(): void {
    this.client.once(Events.ClientReady, async (readyClient) => {
      logger.info(`Bot is ready! Logged in as ${readyClient.user.tag}`);
      await this.registerSlashCommands();
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const command = this.commands.get(interaction.commandName);
      if (!command) {
        logger.warn(`Unknown command: ${interaction.commandName}`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        logger.error(`Error executing command ${interaction.commandName}`, error);

        const userError = await errorHandler.handleError(error as Error, {
          userId: interaction.user.id,
          channelId: interaction.channelId,
          serverId: interaction.guildId || undefined,
          command: interaction.commandName
        });

        const content = `❌ **エラー**: ${userError.message}${
          userError.suggestion ? `\n💡 **解決策**: ${userError.suggestion}` : ''
        }`;

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content, ephemeral: true });
        } else {
          await interaction.reply({ content, ephemeral: true });
        }
      }
    });

    this.client.on(Events.Error, (error) => {
      logger.error('Discord client error', error);
    });

    this.client.on(Events.Warn, (warning) => {
      logger.warn('Discord client warning', { warning });
    });
  }

  private async registerSlashCommands(): Promise<void> {
    try {
      logger.info('Started refreshing application (/) commands.');

      const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
      const commandsData = Array.from(this.commands.values()).map(cmd => cmd.data);

      if (process.env.NODE_ENV === 'development' && process.env.GUILD_ID) {
        // Development: Register commands to specific guild
        await rest.put(
          Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID),
          { body: commandsData }
        );
        logger.info('Successfully reloaded guild application (/) commands.');
      } else {
        // Production: Register commands globally
        await rest.put(
          Routes.applicationCommands(process.env.CLIENT_ID!),
          { body: commandsData }
        );
        logger.info('Successfully reloaded global application (/) commands.');
      }
    } catch (error) {
      logger.error('Failed to reload application (/) commands', error);
    }
  }

  public async start(): Promise<void> {
    try {
      // Initialize database if available
      if (database.isAvailable()) {
        logger.info('Initializing database...');
        await database.initializeSchema();
        const isConnected = await database.isConnected();
        if (isConnected) {
          logger.info('Database connection established');
        } else {
          logger.warn('Database connection failed, falling back to file storage');
        }
      } else {
        logger.info('DATABASE_URL not found, using file storage');
      }

      await this.client.login(process.env.DISCORD_TOKEN);
    } catch (error) {
      logger.error('Failed to start bot', error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    logger.info('Shutting down bot...');
    this.client.destroy();
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('Received SIGINT. Graceful shutdown...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM. Graceful shutdown...');
  process.exit(0);
});

// Start the bot
if (require.main === module) {
  const bot = new DiscordBot();
  bot.start().catch((error) => {
    logger.error('Failed to start application', error);
    process.exit(1);
  });
}