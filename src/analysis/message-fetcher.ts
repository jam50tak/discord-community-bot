import { Channel, TextChannel, Message, Collection } from 'discord.js';
import { DateRange, MessageFilter } from '../types';
import { logger } from '../utils/logger';

export class MessageFetcher {
  private static instance: MessageFetcher;

  public static getInstance(): MessageFetcher {
    if (!MessageFetcher.instance) {
      MessageFetcher.instance = new MessageFetcher();
    }
    return MessageFetcher.instance;
  }

  public async fetchMessages(
    channels: Channel[],
    dateRange: DateRange
  ): Promise<Message[]> {
    const allMessages: Message[] = [];

    logger.info(`Fetching messages from ${channels.length} channels for period: ${dateRange.label}`);

    for (const channel of channels) {
      if (!channel.isTextBased() || !('messages' in channel)) {
        logger.warn(`Skipping non-text channel: ${channel.id}`);
        continue;
      }

      try {
        const channelMessages = await this.fetchChannelMessages(
          channel as TextChannel,
          dateRange
        );

        allMessages.push(...channelMessages);
        logger.debug(`Fetched ${channelMessages.length} messages from channel ${channel.id}`);
      } catch (error) {
        logger.error(`Failed to fetch messages from channel ${channel.id}`, error);
        continue;
      }
    }

    logger.info(`Total messages fetched: ${allMessages.length}`);
    return allMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  }

  public filterMessages(
    messages: Message[],
    filters: MessageFilter = {}
  ): Message[] {
    const {
      excludeBots = true,
      excludeDeleted = true,
      minLength = 1
    } = filters;

    return messages.filter(message => {
      // Filter bots
      if (excludeBots && message.author.bot) {
        return false;
      }

      // Filter deleted messages (note: deleted messages are not usually returned by Discord API)
      if (excludeDeleted && message.deletable) {
        return false;
      }

      // Filter by content length
      if (message.content.length < minLength) {
        return false;
      }

      // Filter system messages
      if (message.system) {
        return false;
      }

      return true;
    });
  }

  public validateDateRange(dateRange: DateRange): boolean {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Check if start date is not more than 1 week ago
    if (dateRange.start < oneWeekAgo) {
      return false;
    }

    // Check if start is before end
    if (dateRange.start >= dateRange.end) {
      return false;
    }

    // Check if end is not in the future
    if (dateRange.end > now) {
      return false;
    }

    return true;
  }

  public async getChannelInfo(channels: Channel[]): Promise<any[]> {
    const channelInfo = [];

    for (const channel of channels) {
      if (!channel.isTextBased()) continue;

      const textChannel = channel as TextChannel;

      channelInfo.push({
        id: channel.id,
        name: textChannel.name,
        type: channel.type,
        parentId: textChannel.parentId,
        position: textChannel.position,
        memberCount: textChannel.guild.memberCount
      });
    }

    return channelInfo;
  }

  private async fetchChannelMessages(
    channel: TextChannel,
    dateRange: DateRange
  ): Promise<Message[]> {
    const messages: Message[] = [];
    let lastMessageId: string | undefined;
    const batchSize = 100;

    while (true) {
      try {
        const fetchOptions: { limit: number; before?: string } = { limit: batchSize };
        if (lastMessageId) {
          fetchOptions.before = lastMessageId;
        }

        const batch: Collection<string, Message> = await channel.messages.fetch(fetchOptions);

        if (batch.size === 0) break;

        let foundOldMessage = false;

        for (const [, message] of batch) {
          // Check if message is within date range
          if (message.createdAt < dateRange.start) {
            foundOldMessage = true;
            break;
          }

          if (message.createdAt >= dateRange.start && message.createdAt <= dateRange.end) {
            messages.push(message);
          }
        }

        // If we found a message older than our range, stop fetching
        if (foundOldMessage) break;

        // Prepare for next batch
        lastMessageId = batch.last()?.id;

        // Add small delay to avoid rate limiting
        await this.delay(100);

      } catch (error) {
        logger.error(`Error fetching message batch from channel ${channel.id}`, error);
        break;
      }
    }

    return messages;
  }

  public extractMessageData(messages: Message[]): any {
    return {
      totalMessages: messages.length,
      timeRange: {
        start: messages.length > 0 ? messages[0].createdAt.toISOString() : null,
        end: messages.length > 0 ? messages[messages.length - 1].createdAt.toISOString() : null
      },
      channels: this.groupMessagesByChannel(messages),
      users: this.analyzeUsers(messages),
      timeline: this.createTimeline(messages),
      content: this.extractContent(messages)
    };
  }

  private groupMessagesByChannel(messages: Message[]): any[] {
    const channelGroups = new Map<string, Message[]>();

    for (const message of messages) {
      const channelId = message.channelId;
      if (!channelGroups.has(channelId)) {
        channelGroups.set(channelId, []);
      }
      channelGroups.get(channelId)!.push(message);
    }

    return Array.from(channelGroups.entries()).map(([channelId, msgs]) => ({
      channelId,
      channelName: (msgs[0].channel as TextChannel).name,
      messageCount: msgs.length,
      uniqueUsers: new Set(msgs.map(m => m.author.id)).size,
      messages: msgs.map(m => ({
        id: m.id,
        content: m.content,
        authorId: m.author.id,
        authorName: m.author.displayName || m.author.username,
        timestamp: m.createdAt.toISOString(),
        reactions: m.reactions.cache.map(r => ({
          emoji: r.emoji.name,
          count: r.count
        })),
        attachments: m.attachments.size,
        embeds: m.embeds.length
      }))
    }));
  }

  private analyzeUsers(messages: Message[]): any[] {
    const userStats = new Map<string, any>();

    for (const message of messages) {
      const userId = message.author.id;

      if (!userStats.has(userId)) {
        userStats.set(userId, {
          id: userId,
          username: message.author.displayName || message.author.username,
          messageCount: 0,
          totalCharacters: 0,
          channels: new Set<string>(),
          firstMessage: message.createdAt,
          lastMessage: message.createdAt
        });
      }

      const stats = userStats.get(userId);
      stats.messageCount++;
      stats.totalCharacters += message.content.length;
      stats.channels.add(message.channelId);

      if (message.createdAt < stats.firstMessage) {
        stats.firstMessage = message.createdAt;
      }
      if (message.createdAt > stats.lastMessage) {
        stats.lastMessage = message.createdAt;
      }
    }

    return Array.from(userStats.values()).map(stats => ({
      ...stats,
      channels: stats.channels.size,
      averageMessageLength: Math.round(stats.totalCharacters / stats.messageCount),
      firstMessage: stats.firstMessage.toISOString(),
      lastMessage: stats.lastMessage.toISOString()
    }));
  }

  private createTimeline(messages: Message[]): any[] {
    const hourlyStats = new Map<string, number>();

    for (const message of messages) {
      const hour = new Date(message.createdAt).toISOString().slice(0, 13) + ':00:00Z';
      hourlyStats.set(hour, (hourlyStats.get(hour) || 0) + 1);
    }

    return Array.from(hourlyStats.entries())
      .map(([hour, count]) => ({ hour, messageCount: count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }

  private extractContent(messages: Message[]): any {
    return {
      totalCharacters: messages.reduce((sum, m) => sum + m.content.length, 0),
      averageLength: Math.round(
        messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length
      ),
      withAttachments: messages.filter(m => m.attachments.size > 0).length,
      withEmbeds: messages.filter(m => m.embeds.length > 0).length,
      withReactions: messages.filter(m => m.reactions.cache.size > 0).length,
      sampleMessages: messages
        .filter(m => m.content.length > 20)
        .slice(0, 50)
        .map(m => ({
          content: m.content.slice(0, 200) + (m.content.length > 200 ? '...' : ''),
          author: m.author.displayName || m.author.username,
          timestamp: m.createdAt.toISOString(),
          channel: (m.channel as TextChannel).name
        }))
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const messageFetcher = MessageFetcher.getInstance();