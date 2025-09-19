export type AIProvider = 'chatgpt' | 'gemini' | 'claude';

export interface ServerConfig {
  serverId: string;
  serverName: string;
  analyzedChannels: string[];
  aiProvider: AIProvider;
  customPrompt?: string;
  rules: string[];
  clientRequirements: string[];
  adminRoles: string[];
  settings: {
    defaultAnalysisPeriod: 'today' | 'yesterday';
    useCustomPrompt: boolean;
  };
}

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export interface AnalysisResult {
  summary: string;
  metrics: CommunityMetrics;
  trends: TrendAnalysis;
  issues: Issue[];
  recommendations: Recommendation[];
}

export interface CommunityMetrics {
  totalMessages: number;
  activeUsers: number;
  channelActivity: ChannelActivity[];
  timeDistribution: TimeDistribution[];
}

export interface ChannelActivity {
  channelId: string;
  channelName: string;
  messageCount: number;
  uniqueUsers: number;
}

export interface TimeDistribution {
  hour: number;
  messageCount: number;
}

export interface TrendAnalysis {
  popularTopics: Topic[];
  sentimentOverall: SentimentScore;
  userEngagement: UserEngagement[];
}

export interface Topic {
  name: string;
  mentions: number;
  sentiment: SentimentScore;
}

export interface SentimentScore {
  positive: number;
  neutral: number;
  negative: number;
}

export interface UserEngagement {
  userId: string;
  username: string;
  messageCount: number;
  averageSentiment: number;
}

export interface Issue {
  type: 'conflict' | 'spam' | 'inappropriate' | 'low_engagement';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedUsers?: string[];
  suggestedAction: string;
}

export interface Recommendation {
  priority: 'low' | 'medium' | 'high';
  category: 'engagement' | 'moderation' | 'content' | 'community';
  title: string;
  description: string;
  actionItems: string[];
}

export interface AnalysisContext {
  serverRules: string[];
  clientRequirements: string[];
  previousReports?: AnalysisResult[];
  communityContext: CommunityContext;
}

export interface CommunityContext {
  serverSize: number;
  primaryLanguage: string;
  communityType: string;
  activeHours: string;
}

export interface ConsultSession {
  sessionId: string;
  channelId: string;
  adminId: string;
  status: 'analyzing' | 'waiting_info' | 'providing_solution';
  context: ConsultContext;
  conversation: ConsultMessage[];
}

export interface ConsultContext {
  serverRules: string[];
  clientRequirements: string[];
  previousConsults?: ConsultSession[];
  communityContext: CommunityContext;
}

export interface ConsultMessage {
  timestamp: Date;
  sender: 'admin' | 'bot';
  content: string;
  type: 'input' | 'question' | 'analysis' | 'solution';
}

export interface ConsultResponse {
  type: 'question' | 'analysis' | 'solution' | 'completed';
  message: string;
  requiredInfo?: InfoRequest[];
  analysis?: ConversationAnalysis;
  recommendations?: Recommendation[];
  nextSteps?: string[];
}

export interface InfoRequest {
  type: 'users' | 'channels' | 'timeframe' | 'context';
  question: string;
  required: boolean;
}

export interface ConversationAnalysis {
  participants: UserProfile[];
  timeline: ConversationEvent[];
  sentiment: SentimentAnalysis;
  keyIssues: Issue[];
  context: string;
}

export interface UserProfile {
  userId: string;
  username: string;
  recentActivity: ActivitySummary;
  behaviorPattern: string;
}

export interface ActivitySummary {
  messageCount: number;
  averageSentiment: number;
  topChannels: string[];
  lastActive: Date;
}

export interface ConversationEvent {
  timestamp: Date;
  userId: string;
  channelId: string;
  messageContent: string;
  sentiment: number;
  reactions: ReactionData[];
}

export interface ReactionData {
  emoji: string;
  count: number;
  users: string[];
}

export interface SentimentAnalysis {
  overall: SentimentScore;
  byUser: UserSentiment[];
  timeline: SentimentTimeline[];
}

export interface UserSentiment {
  userId: string;
  sentiment: SentimentScore;
}

export interface SentimentTimeline {
  timestamp: Date;
  sentiment: number;
}

export enum ErrorType {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  DISCORD_API_ERROR = 'DISCORD_API_ERROR',
  AI_API_ERROR = 'AI_API_ERROR',
  CONFIG_ERROR = 'CONFIG_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  API_KEY_MISSING = 'API_KEY_MISSING'
}

export interface MessageFilter {
  excludeBots?: boolean;
  excludeDeleted?: boolean;
  minLength?: number;
}

export interface PromptValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}