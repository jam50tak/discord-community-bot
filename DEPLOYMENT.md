# Discord AI Community Bot - デプロイ手順

## 🚀 Railwayデプロイ手順

### 1. Discord Developer Portal設定

1. [Discord Developer Portal](https://discord.com/developers/applications)にアクセス
2. アプリケーション「1418533818205208596」を選択
3. **Bot** タブで以下を設定：
   - `MESSAGE CONTENT INTENT` ✅ 有効
   - `SERVER MEMBERS INTENT` ✅ 有効
   - `GUILD MESSAGES INTENT` ✅ 有効

### 2. Railway設定

1. [Railway](https://railway.app)にアクセス
2. GitHubリポジトリから新しいプロジェクトを作成
3. **PostgreSQL データベースを追加**：
   - プロジェクトダッシュボードで「+ New」ボタンをクリック
   - 「Database」→「PostgreSQL」を選択
   - Railway が自動的に `DATABASE_URL` 環境変数を設定

4. 環境変数を設定：

```bash
# 必須設定
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=1418533818205208596
NODE_ENV=production
LOG_LEVEL=info
ENCRYPTION_KEY=4493eba6301192459a31118c6bb53c32ff9a415b77e4a5b3eea4cce113135b3f

# AI API Keys（推奨：デプロイでリセットされないように環境変数で設定）
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_API_KEY=your_google_api_key_here

# オプション（開発用）
GUILD_ID=your_test_guild_id
```

### ⚠️ 重要：設定の永続化

**問題**: デプロイのたびに以下の設定がリセットされていました：
- APIキー設定
- カスタムプロンプト
- 分析対象チャンネル
- 権限設定
- その他のボット設定

**解決策**: PostgreSQLデータベースによる永続化

#### データベース使用時（推奨）
✅ PostgreSQL追加後は全設定が自動的に永続化されます
✅ デプロイ後も設定が保持されます
✅ APIキーは環境変数 + データベースの二重保護

#### フォールバック（データベースなし）
⚠️ データベースがない場合はファイルストレージにフォールバック
⚠️ デプロイのたびに設定リセット
⚠️ APIキーのみ環境変数で保護

### 3. デプロイ実行

Railway が自動的に以下を実行します：
1. 依存関係インストール (`npm ci`)
2. TypeScript ビルド (`npm run build`)
3. ボット起動 (`npm start`)

### 4. 初期設定

ボットがオンラインになったら：

```bash
# AI プロバイダー設定
/config ai set provider:claude

# API キー設定
/config apikey set provider:claude key:your_claude_api_key

# 分析対象チャンネル追加
/config channels add channel:#general

# 分析実行
/analyze period:today
```

## 🔧 トラブルシューティング

### ボットが起動しない
- Discord Token が正しいか確認
- Intent 設定が有効になっているか確認

### コマンドが表示されない
- ボットがサーバーに招待されているか確認
- スラッシュコマンドの同期を待つ（最大1時間）

### API エラー
- `/config apikey status` で設定確認
- API キーの権限を確認

## 📊 使用方法

### 基本分析
```bash
/analyze period:today      # 今日の分析
/analyze period:yesterday  # 昨日の分析
/analyze date:2024-01-15   # 日付指定
```

### クイック分析
```bash
/quick-analyze  # 設定済み条件で一発分析
```

### 相談機能
```bash
/consult situation:ユーザー間でトラブルが発生 user1:@user1 channel:#general
```

## 🎯 次のステップ

1. カスタムプロンプト設定
2. 定期分析の自動化
3. 分析結果の活用

---

**✅ デプロイ完了！**
Discord AI コミュニティ管理ボットが稼働開始しました。