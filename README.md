# Discord Community AI Bot

AI搭載のDiscordコミュニティ管理ボットです。ChatGPT、Gemini、Claudeに対応し、会話分析、トラブル相談、コミュニティ運営改善の提案を行います。

## 🌟 主要機能

### 📊 会話分析
- 指定期間の会話を詳細分析
- アクティビティ、トレンド、感情分析
- 改善提案とアクションアイテム
- ワンクリック分析機能

### 💬 対話型相談
- トラブルや問題の相談機能
- 関連会話の自動分析
- 段階的な解決策提案
- 実行可能なアドバイス

### 🔧 高度な設定管理
- 3つのAI（ChatGPT/Gemini/Claude）から選択
- サーバー別カスタムプロンプト
- 暗号化されたAPIキー管理
- チャンネル別分析設定

## 🤖 対応AI

| AI | 特徴 | コスト |
|---|---|---|
| **ChatGPT (OpenAI)** | 高品質な日本語対応、幅広い知識 | 中 |
| **Gemini (Google)** | 高速処理、無料利用可能 | 低 |
| **Claude (Anthropic)** | 詳細な分析、安全性重視 | 中 |

## 🚀 セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成：

```bash
cp .env.example .env
```

`.env` ファイルを編集：

```env
# Discord Bot設定
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_client_id

# 暗号化キー（32文字のランダム文字列）
ENCRYPTION_KEY=your_32_character_encryption_key

# 開発環境設定（オプション）
NODE_ENV=development
LOG_LEVEL=info
GUILD_ID=your_test_guild_id
```

### 3. ビルドと起動

```bash
# ビルド
npm run build

# 本番環境で起動
npm start

# 開発環境で起動
npm run dev
```

## 📋 コマンド一覧

### `/analyze`
指定期間の会話を分析
```
/analyze period:today
/analyze period:yesterday
/analyze date:2024-01-15
```

### `/quick-analyze`
設定済み条件でワンクリック分析
```
/quick-analyze
```

### `/config`
ボットの設定管理

#### AI設定
```
/config ai set provider:claude
/config ai view
```

#### APIキー管理
```
/config apikey set provider:claude key:your_api_key
/config apikey remove provider:claude
/config apikey status
```

#### チャンネル設定
```
/config channels add channel:#general
/config channels remove channel:#general
/config channels list
```

#### プロンプト設定
```
/config prompt set prompt:カスタムプロンプト
/config prompt view
/config prompt reset
/config prompt templates
```

### `/consult`
トラブルや問題の相談
```
/consult situation:ユーザー間でトラブルが発生しています user1:@user1 channel:#general timeframe:today
```

### `/help`
ヘルプとコマンド説明の表示

## 🛠️ 初期設定手順

### 1. AIプロバイダーの選択
```
/config ai set provider:claude
```

### 2. APIキーの設定
選択したAIのAPIキーを設定：
```
/config apikey set provider:claude key:your_claude_api_key
```

### 3. 分析対象チャンネルの追加
```
/config channels add channel:#general
/config channels add channel:#random
```

### 4. 分析実行
```
/analyze period:today
```
または
```
/quick-analyze
```

## 🔒 セキュリティ

- **APIキー暗号化**: 全てのAPIキーは暗号化して保存
- **権限管理**: 管理者のみがコマンドを実行可能
- **データ保護**: メッセージデータは分析後即座に破棄
- **ログ管理**: 適切なログレベルでの記録

## 📁 プロジェクト構造

```
discord-community-bot/
├── src/
│   ├── bot.ts              # Bot エントリーポイント
│   ├── commands/           # スラッシュコマンド
│   │   ├── analyze.ts
│   │   ├── quick-analyze.ts
│   │   ├── config.ts
│   │   ├── consult.ts
│   │   └── help.ts
│   ├── analysis/           # AI分析エンジン
│   │   ├── ai-analyzer-factory.ts
│   │   ├── chatgpt-analyzer.ts
│   │   ├── gemini-analyzer.ts
│   │   ├── claude-analyzer.ts
│   │   ├── message-fetcher.ts
│   │   └── report-generator.ts
│   ├── config/             # 設定管理
│   │   ├── server-config.ts
│   │   ├── apikey-manager.ts
│   │   └── prompt-manager.ts
│   ├── utils/              # ユーティリティ
│   │   ├── logger.ts
│   │   ├── error-handler.ts
│   │   ├── permission-checker.ts
│   │   ├── date-parser.ts
│   │   └── crypto.ts
│   └── types/              # TypeScript型定義
├── config/                 # 設定ファイル保存先
└── dist/                   # ビルド済みファイル
```

## 🐛 トラブルシューティング

### APIキーエラー
```bash
# APIキーの設定状況を確認
/config apikey status

# APIキーを再設定
/config apikey set provider:claude key:new_api_key
```

### 権限エラー
- ボットにサーバー管理権限があることを確認
- または管理者ロールを設定してください

### 分析チャンネルエラー
```bash
# 設定されているチャンネルを確認
/config channels list

# 新しいチャンネルを追加
/config channels add channel:#your-channel
```

## 📊 分析レポートについて

分析レポートには以下の情報が含まれます：

- **活動指標**: メッセージ数、アクティブユーザー数、チャンネル別活動
- **トレンド分析**: 人気トピック、感情分析、ユーザーエンゲージメント
- **課題の特定**: 潜在的な問題とその重要度
- **改善提案**: 具体的なアクションアイテムと優先度

## 🔄 定期実行の設定

クイック分析を定期実行したい場合は、cron jobやタスクスケジューラーを使用：

```bash
# 毎日朝9時に実行（例）
0 9 * * * cd /path/to/bot && npm run quick-analyze
```

## 🆘 サポート

問題が発生した場合：

1. `/help` コマンドで基本情報を確認
2. `/config ai view` で設定状況を確認
3. ログファイルを確認（LOG_LEVEL=debug に設定）
4. GitHub Issues で報告

## 📄 ライセンス

MIT License

## 🤝 貢献

プルリクエストやイシューの報告を歓迎します。

---

**注意**: このボットを使用するには、選択したAIサービスのAPIキーが必要です。各サービスの利用規約を確認してください。