import { ServerConfig, AnalysisContext, PromptValidation } from '../types';

export class PromptManager {
  private static instance: PromptManager;

  public static getInstance(): PromptManager {
    if (!PromptManager.instance) {
      PromptManager.instance = new PromptManager();
    }
    return PromptManager.instance;
  }

  public getDefaultPrompt(): string {
    return `あなたはDiscordコミュニティの分析専門家です。提供された会話データを分析し、以下の観点から包括的なレポートを作成してください：

## 分析項目

### 1. コミュニティ活動状況
- **メッセージ数**: 総メッセージ数とアクティブユーザー数
- **チャンネル別活動**: 各チャンネルの活動度と特徴
- **時間帯分析**: 活発な時間帯と傾向

### 2. 会話の内容と傾向
- **主要話題**: よく話されているトピックやテーマ
- **トレンド**: 新しく出てきた話題や注目されている内容
- **議論の質**: 建設的な議論や深い話し合いの有無

### 3. 感情・雰囲気分析
- **全体的な雰囲気**: ポジティブ/ネガティブの傾向
- **ユーザー関係**: メンバー間の関係性や交流の様子
- **問題の兆候**: 炎上や対立の可能性

### 4. ユーザーエンゲージメント
- **参加度**: アクティブなメンバーの特徴
- **新規参加**: 新しいメンバーの定着状況
- **貢献度**: 価値ある投稿をしているユーザー

### 5. 改善提案とアクションアイテム
- **短期的改善**: すぐに実行できる改善策
- **長期的戦略**: コミュニティ成長のための施策
- **注意点**: 管理者が注意すべき事項

## 出力形式
- 簡潔で分かりやすい日本語で記述
- 具体的な数値やデータを含める
- 実行可能な提案を提示
- 重要度に応じて優先順位を付ける

分析対象期間の会話を総合的に評価し、コミュニティの健全な発展に役立つ洞察を提供してください。`;
  }

  public buildAnalysisPrompt(
    serverConfig: ServerConfig,
    messagesData: any,
    context: AnalysisContext
  ): string {
    const basePrompt = serverConfig.settings.useCustomPrompt && serverConfig.customPrompt
      ? serverConfig.customPrompt
      : this.getDefaultPrompt();

    const contextualPrompt = this.addContextualInformation(basePrompt, serverConfig, context);
    const dataPrompt = this.addMessageData(contextualPrompt, messagesData);

    return dataPrompt;
  }

  public buildConsultPrompt(
    situation: string,
    serverConfig: ServerConfig,
    _context: any
  ): string {
    return `あなたはDiscordコミュニティの管理コンサルタントです。以下の状況について分析し、適切な対応策を提案してください。

## 相談内容
${situation}

## サーバー情報
- サーバー名: ${serverConfig.serverName}
- 主なルール: ${serverConfig.rules.join(', ') || 'なし'}
- クライアント要望: ${serverConfig.clientRequirements.join(', ') || 'なし'}

## 対応方針
1. 状況の分析と問題の特定
2. 関係者の心理状況の考慮
3. 具体的な対応手順の提示
4. 予防策や再発防止策の提案

以下の点を考慮して回答してください：
- コミュニティの健全性維持
- 関係者全員への配慮
- 実行可能で具体的な提案
- 段階的なアプローチ

日本語で丁寧に回答してください。`;
  }

  public validatePrompt(prompt: string): PromptValidation {
    const validation: PromptValidation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check prompt length
    if (prompt.length < 50) {
      validation.errors.push('プロンプトが短すぎます（最低50文字必要）');
      validation.isValid = false;
    }

    if (prompt.length > 8000) {
      validation.warnings.push('プロンプトが長すぎる可能性があります（8000文字以上）');
    }

    // Check for basic structure
    if (!prompt.includes('分析') && !prompt.includes('解析')) {
      validation.warnings.push('分析指示が明確でない可能性があります');
    }

    // Check for Japanese content
    const japaneseRegex = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/;
    if (!japaneseRegex.test(prompt)) {
      validation.warnings.push('日本語の指示が含まれていない可能性があります');
    }

    // Check for potentially harmful instructions
    const harmfulPatterns = [
      /個人情報.*取得/i,
      /秘密.*暴露/i,
      /誹謗中傷/i,
      /攻撃的.*内容/i
    ];

    for (const pattern of harmfulPatterns) {
      if (pattern.test(prompt)) {
        validation.errors.push('有害な可能性のある指示が含まれています');
        validation.isValid = false;
        break;
      }
    }

    return validation;
  }

  private addContextualInformation(
    basePrompt: string,
    serverConfig: ServerConfig,
    context: AnalysisContext
  ): string {
    let contextInfo = '\n\n## サーバー固有情報\n';

    if (serverConfig.serverName) {
      contextInfo += `- **サーバー名**: ${serverConfig.serverName}\n`;
    }

    if (serverConfig.rules.length > 0) {
      contextInfo += `- **コミュニティルール**:\n${serverConfig.rules.map(rule => `  - ${rule}`).join('\n')}\n`;
    }

    if (serverConfig.clientRequirements.length > 0) {
      contextInfo += `- **クライアント要望**:\n${serverConfig.clientRequirements.map(req => `  - ${req}`).join('\n')}\n`;
    }

    if (context.communityContext) {
      contextInfo += `- **コミュニティ特性**:\n`;
      contextInfo += `  - 規模: ${context.communityContext.serverSize}人\n`;
      contextInfo += `  - 主要言語: ${context.communityContext.primaryLanguage}\n`;
      contextInfo += `  - コミュニティタイプ: ${context.communityContext.communityType}\n`;
      contextInfo += `  - アクティブ時間: ${context.communityContext.activeHours}\n`;
    }

    return basePrompt + contextInfo;
  }

  private addMessageData(prompt: string, messagesData: any): string {
    const dataSection = '\n\n## 分析対象データ\n';
    const formattedData = JSON.stringify(messagesData, null, 2);

    return prompt + dataSection + '```json\n' + formattedData + '\n```\n\n上記のデータを基に分析を行ってください。';
  }

  public getPromptTemplates(): Record<string, string> {
    return {
      'default': this.getDefaultPrompt(),
      'engagement': `コミュニティのエンゲージメント向上に特化した分析を行ってください。

## 重点分析項目
1. ユーザー参加度の詳細分析
2. 投稿の質と反応の関係
3. 時間帯別のアクティビティパターン
4. エンゲージメントを促進する要素の特定
5. 非アクティブユーザーの活性化策

具体的な数値とともに、実行可能な改善策を提示してください。`,

      'moderation': `コミュニティの健全性とモデレーションの観点から分析してください。

## 重点分析項目
1. 問題のある投稿や行動の検出
2. ユーザー間の対立や摩擦の分析
3. ルール違反の傾向と対策
4. 予防的モデレーションの提案
5. コミュニティ文化の健全性評価

管理者が取るべき具体的なアクションを優先順位とともに提示してください。`,

      'growth': `コミュニティの成長と発展に焦点を当てて分析してください。

## 重点分析項目
1. 新規ユーザーの定着率分析
2. コンテンツの質と多様性評価
3. 影響力のあるメンバーの特定
4. 成長阻害要因の洗い出し
5. 持続可能な成長戦略の提案

長期的な視点での改善策と成長戦略を提示してください。`
    };
  }
}

export const promptManager = PromptManager.getInstance();