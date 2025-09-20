# Discord Community Bot - 権限管理ガイド

## 🔐 権限システム概要

このボットは階層的な権限システムを採用しており、管理者、ロール、個別ユーザーごとに細かく権限を設定できます。

## 👑 管理者権限

### 管理者の定義
以下のいずれかに該当するユーザーは自動的に管理者として扱われます：
- サーバーの所有者
- Discord の「管理者」権限を持つユーザー
- Discord の「サーバー管理」権限を持つユーザー
- ボット設定で指定された管理者ロールを持つユーザー

### 管理者が実行できる機能
- ✅ **全ての機能を無制限に使用可能**
- ✅ 権限設定に関係なく全コマンドを実行可能

---

## 📊 機能別権限設定

### 1. 基本機能 (`use_bot`)

| 項目 | 内容 |
|------|------|
| **説明** | ボットの基本機能へのアクセス |
| **含まれる機能** | ボットへの基本的なアクセス権 |
| **設定者** | 管理者のみ |
| **実行者** | 権限を付与されたユーザー・ロール |
| **デフォルト** | 無効（ヘルプのみ表示可能） |

### 2. 会話分析 (`run_analysis`)

| 項目 | 内容 |
|------|------|
| **説明** | `/analyze` コマンドで詳細な会話分析を実行 |
| **含まれる機能** | 期間指定分析、カスタム日付分析 |
| **設定者** | 管理者のみ |
| **実行者** | この権限を持つユーザー・ロール |
| **推奨対象** | モデレーター、分析担当者 |

**設定例：**
```
/config permissions role-add role:@モデレーター permissions:use_bot,run_analysis
```

### 3. クイック分析 (`quick_analyze`)

| 項目 | 内容 |
|------|------|
| **説明** | `/quick-analyze` コマンドでワンクリック分析を実行 |
| **含まれる機能** | 設定済み条件での即座の分析 |
| **設定者** | 管理者のみ |
| **実行者** | この権限を持つユーザー・ロール |
| **推奨対象** | 定期チェック担当者、サブ管理者 |

**設定例：**
```
/config permissions user-add user:@分析担当 permissions:use_bot,quick_analyze
```

### 4. 相談機能 (`consult`)

| 項目 | 内容 |
|------|------|
| **説明** | `/consult` コマンドでトラブル相談・解決提案 |
| **含まれる機能** | 問題分析、解決策提案、関連会話分析 |
| **設定者** | 管理者のみ |
| **実行者** | この権限を持つユーザー・ロール |
| **推奨対象** | 管理者、上級モデレーター |

**設定例：**
```
/config permissions role-add role:@上級モデレーター permissions:use_bot,consult
```

### 5. ボット設定管理 (`manage_config`)

| 項目 | 内容 |
|------|------|
| **説明** | ボットの各種設定を変更 |
| **含まれる機能** | AI設定、APIキー、チャンネル、プロンプト設定 |
| **設定者** | **管理者限定** |
| **実行者** | **管理者のみ** |
| **注意** | この権限は管理者以外に付与できません |

**管理者限定機能：**
- `/config ai set/view`
- `/config apikey set/remove/status`
- `/config channels add/remove/list`
- `/config prompt set/view/reset/templates`

### 6. 権限管理 (`manage_permissions`)

| 項目 | 内容 |
|------|------|
| **説明** | ユーザー・ロールの権限設定を管理 |
| **含まれる機能** | 権限の付与・削除、設定表示 |
| **設定者** | **管理者限定** |
| **実行者** | **管理者のみ** |
| **注意** | この権限は管理者以外に付与できません |

**管理者限定機能：**
- `/config permissions *` (全ての権限管理コマンド)

### 7. ヘルプ表示 (`view_help`)

| 項目 | 内容 |
|------|------|
| **説明** | `/help` コマンドでヘルプを表示 |
| **含まれる機能** | コマンド説明、使用方法の確認 |
| **設定者** | 管理者のみ |
| **実行者** | この権限を持つユーザー・ロール |
| **デフォルト** | 有効（全ユーザー） |

---

## 🎯 推奨権限設定パターン

### パターン1: 基本設定（小規模サーバー）
```bash
# デフォルト権限：ヘルプのみ
/config permissions default permissions:view_help

# モデレーターロール：分析機能
/config permissions role-add role:@モデレーター permissions:use_bot,run_analysis,quick_analyze

# 管理者は自動的に全権限を持つ
```

### パターン2: 段階的権限（中規模サーバー）
```bash
# デフォルト権限：ヘルプのみ
/config permissions default permissions:view_help

# 一般メンバー：基本使用のみ
/config permissions role-add role:@メンバー permissions:use_bot

# モデレーター：分析機能
/config permissions role-add role:@モデレーター permissions:use_bot,run_analysis,quick_analyze

# 上級モデレーター：相談機能も追加
/config permissions role-add role:@上級モデレーター permissions:use_bot,run_analysis,quick_analyze,consult
```

### パターン3: 個別権限設定（大規模サーバー）
```bash
# デフォルト権限：ヘルプ + 基本使用
/config permissions default permissions:view_help,use_bot

# 分析専任者に個別権限（カスタム設定）
/config permissions user-add user:@分析専門 permissions:use_bot,run_analysis,quick_analyze custom:true

# 特定ユーザーに相談権限を追加（継承設定）
/config permissions user-add user:@経験豊富なメンバー permissions:consult custom:false
```

---

## 🔍 権限確認方法

### 現在の設定を確認
```bash
/config permissions view
```

### 利用可能な権限一覧
```bash
/config permissions list-permissions
```

### 特定ユーザーの実効権限を確認
権限は以下の優先順位で適用されます：
1. **管理者権限** → 全権限
2. **管理者限定機能** → 管理者のみ
3. **ユーザー個別権限（カスタム）** → 既存権限を上書き
4. **ユーザー個別権限（継承）** → ロール権限に追加
5. **ロール権限** → 所属ロールの権限
6. **デフォルト権限** → 全ユーザーの基本権限

---

## ⚠️ 重要な注意事項

### セキュリティ
- `manage_config` と `manage_permissions` は **常に管理者限定**
- これらの権限は一般ユーザーやロールに付与できません
- APIキーや重要設定へのアクセスを制限

### 権限設定のベストプラクティス
1. **最小権限の原則**: 必要最小限の権限のみ付与
2. **段階的権限**: ロールに応じて段階的に権限を設定
3. **定期見直し**: 権限設定を定期的に確認・更新
4. **テスト実行**: 権限変更後は動作確認を実施

### トラブルシューティング
- 権限エラーが発生した場合は `/config permissions view` で設定を確認
- ユーザーが機能を使用できない場合は、該当する権限が付与されているか確認
- 管理者は常に全機能を使用可能なため、テスト時は一般ユーザーアカウントを使用

---

## 📝 権限設定例

### 例1: 新しいモデレーターの追加
```bash
# ステップ1: モデレーターロールに基本権限を設定
/config permissions role-add role:@モデレーター permissions:use_bot,run_analysis

# ステップ2: 特定の経験豊富なモデレーターに追加権限
/config permissions user-add user:@熟練モデレーター permissions:consult custom:false
```

### 例2: 分析専任チームの作成
```bash
# 分析チーム用ロールを作成し、権限を付与
/config permissions role-add role:@分析チーム permissions:use_bot,run_analysis,quick_analyze

# チームリーダーには相談権限も追加
/config permissions user-add user:@分析リーダー permissions:consult custom:false
```

### 例3: 一時的な権限付与
```bash
# イベント期間中の一時的な権限付与
/config permissions user-add user:@イベント担当 permissions:use_bot,quick_analyze custom:true

# イベント終了後の権限削除
/config permissions user-remove user:@イベント担当
```