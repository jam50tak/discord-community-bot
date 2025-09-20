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

### 🔐 詳細な権限管理
- ロール別・ユーザー別権限設定
- 機能ごとの細かいアクセス制御
- 管理者限定機能の保護
- 段階的権限システム

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

#### 権限管理
```
/config permissions view
/config permissions list-permissions
/config permissions role-add role:@ロール permissions:権限リスト
/config permissions role-remove role:@ロール
/config permissions user-add user:@ユーザー permissions:権限リスト custom:true/false
/config permissions user-remove user:@ユーザー
/config permissions default permissions:権限リスト
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

### 4. 権限設定（推奨）
```
# 一般メンバーに基本権限を付与
/config permissions role-add role:@メンバー permissions:use_bot,view_help

# モデレーターに分析権限を付与
/config permissions role-add role:@モデレーター permissions:use_bot,run_analysis,quick_analyze
```

### 5. 分析実行
```
/analyze period:today
```
または
```
/quick-analyze
```

## 🔒 セキュリティ

- **APIキー暗号化**: 全てのAPIキーは暗号化して保存
- **段階的権限管理**: ロール・ユーザー別の細かい権限制御
- **管理者限定機能**: 設定変更・権限管理は管理者のみ
- **データ保護**: メッセージデータは分析後即座に破棄
- **ログ管理**: 適切なログレベルでの記録

## 🔐 権限管理システム

### 利用可能な権限
| 権限 | 説明 | 推奨対象 |
|------|------|----------|
| `use_bot` | ボットの基本使用 | 一般メンバー |
| `run_analysis` | 詳細分析の実行 | モデレーター |
| `quick_analyze` | クイック分析の実行 | 分析担当者 |
| `consult` | 相談機能の使用 | 上級モデレーター |
| `view_help` | ヘルプの表示 | 全ユーザー |
| `manage_config` | 設定管理（管理者限定） | - |
| `manage_permissions` | 権限管理（管理者限定） | - |

### 権限設定例
```bash
# デフォルト権限の設定
/config permissions default permissions:view_help

# ロール別権限の設定
/config permissions role-add role:@メンバー permissions:use_bot
/config permissions role-add role:@モデレーター permissions:use_bot,run_analysis,quick_analyze
/config permissions role-add role:@上級モデレーター permissions:use_bot,run_analysis,quick_analyze,consult

# 個別ユーザー権限の設定
/config permissions user-add user:@特別ユーザー permissions:consult custom:true
```

### 権限の優先順位
1. **管理者権限** - 常に全権限
2. **管理者限定機能** - 管理者のみアクセス可能
3. **ユーザー個別権限（カスタム）** - 既存権限を上書き
4. **ユーザー個別権限（継承）** - ロール権限に追加
5. **ロール権限** - 所属ロールの権限
6. **デフォルト権限** - 全ユーザーの基本権限

詳細は [PERMISSIONS.md](PERMISSIONS.md) と [PERMISSION_MATRIX.md](PERMISSION_MATRIX.md) を参照してください。

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
│   ├── servers/            # サーバー別設定
│   ├── apikeys.enc         # 暗号化APIキー
│   └── permissions.json    # 権限設定
├── dist/                   # ビルド済みファイル
├── PERMISSIONS.md          # 詳細権限ガイド
└── PERMISSION_MATRIX.md    # 権限マトリックス
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

### 権限エラー
```bash
# 現在の権限設定を確認
/config permissions view

# ユーザーに権限を付与
/config permissions user-add user:@ユーザー permissions:use_bot,run_analysis

# ロールに権限を付与
/config permissions role-add role:@ロール permissions:use_bot,run_analysis
```

## 📊 分析レポートについて

分析レポートには以下の情報が含まれます：

- **活動指標**: メッセージ数、アクティブユーザー数、チャンネル別活動
- **トレンド分析**: 人気トピック、感情分析、ユーザーエンゲージメント
- **課題の特定**: 潜在的な問題とその重要度
- **改善提案**: 具体的なアクションアイテムと優先度

## 🔧 最近の変更履歴

### 2025-09-20: 総合権限管理システム追加
- **新機能**: 詳細な権限管理システムを実装
- **権限種類**: 7つの権限レベル（use_bot, run_analysis, quick_analyze, consult, manage_config, manage_permissions, view_help）
- **管理方法**: ロール別・ユーザー別・デフォルト権限の設定
- **セキュリティ**: 管理者限定機能の保護、段階的権限システム
- **コマンド**: `/config permissions` サブコマンドグループを追加

#### 追加ファイル
- `src/config/permission-manager.ts` - 権限管理ロジック
- `PERMISSIONS.md` - 詳細権限ガイド
- `PERMISSION_MATRIX.md` - 権限マトリックス

#### 権限設定例
```bash
/config permissions role-add role:@モデレーター permissions:use_bot,run_analysis
/config permissions user-add user:@特別ユーザー permissions:consult custom:true
/config permissions default permissions:view_help
```

### 2025-09-20: Claude API モデル更新
- **問題**: Claude API で 404 エラー (`claude-3-sonnet-20240229` モデルが廃止)
- **修正**: Claude analyzer のモデル名を `claude-3-5-sonnet-20241022` に更新
- **影響**: Claude を使用した分析機能が正常に動作するように修正
- **ファイル**: `src/analysis/claude-analyzer.ts` (24行目, 55行目, 108行目, 175行目)

### 技術的詳細
```typescript
// Claude API モデル修正
// 修正前
model: 'claude-3-sonnet-20240229'

// 修正後
model: 'claude-3-5-sonnet-20241022'
```

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