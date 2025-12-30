# デプロイと運用ガイド

## 📌 重要なポイント

### 1. APIキーの管理について

**運営者が1つのAPIキーを設定します**

- APIキーは`.env`ファイルに設定（サーバー側のみ）
- 参加者にはAPIキーは見えません（ブラウザからは見えません）
- 運営者が1つのAPIキーを設定すれば、全員で共有して使えます

**APIキーの設定場所：**
```
プロジェクトフォルダ/
└── .env  ← ここにAPIキーを書く（このファイルは共有しない）
```

### 2. デプロイが必要？ローカルでも動く？

**2つの方法があります：**

#### 方法A: ローカルで起動（同じWiFiが必要）

1. **運営者のPCでサーバーを起動**
   ```bash
   npm install
   # .envファイルにAPIキーを設定
   npm start
   ```

2. **運営者のPCのIPアドレスを確認**
   - Mac: システム設定 → ネットワーク → IPアドレスを確認
   - 例: `192.168.1.100`

3. **参加者にIPアドレスを共有**
   - 参加者はブラウザで `http://192.168.1.100:3000` にアクセス
   - **全員が同じWiFiに接続している必要があります**

**メリット**: すぐ使える、デプロイ不要  
**デメリット**: 同じWiFiが必要、運営者のPCが常に起動している必要がある

#### 方法B: Webデプロイ（推奨・簡単）

1. **VercelやRenderなどの無料サービスにデプロイ**
   - 5分で完了
   - URLを共有するだけ（例: `https://your-app.vercel.app`）
   - どこからでもアクセス可能

**メリット**: 簡単、どこからでもアクセス可能、安定  
**デメリット**: デプロイ手順が必要（でも簡単）

### 3. ユーザーごとに違う画像を作った時どうするの？

**現在の仕組み：**

✅ **各ユーザーは独立して画像を生成できます**

- 30人が同時に異なる画像を生成しても問題ありません
- 各リクエストは独立して処理されます
- 生成された画像は**各ユーザーのブラウザに表示**されます
- ユーザーは「💾 画像をダウンロード」ボタンで自分の画像を保存できます

**画像の保存場所：**
- サーバーには保存されません（メモリ上で処理されるだけ）
- 各ユーザーが自分のPCにダウンロードする
- 右クリック → 「名前を付けて画像を保存」でも保存可能

**例：**
- ユーザーA: 「猫の写真」→ 生成 → ダウンロード
- ユーザーB: 「犬の写真」→ 生成 → ダウンロード
- ユーザーC: 「バナナのケーキ」→ 生成 → ダウンロード

→ それぞれ独立して動作し、他の人の画像には影響しません

## 🚀 デプロイ手順（Vercel - 無料・簡単）

### 準備

1. [Vercel](https://vercel.com)にアカウント作成（GitHubアカウントでログイン可）

### デプロイ方法

#### 方法1: Vercel CLI（簡単）

```bash
# Vercel CLIをインストール
npm i -g vercel

# プロジェクトフォルダで実行
cd "/Users/suguruhirayama/Desktop/DMAT研修"
vercel

# 指示に従う：
# - Set up and deploy? → Y
# - Which scope? → 自分のアカウントを選択
# - Link to existing project? → N
# - Project name? → ai-image-workshop（任意）
# - Directory? → ./
# - Override settings? → N
```

#### 方法2: GitHub経由（推奨）

1. **GitHubにリポジトリを作成**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   # GitHubでリポジトリを作成してから：
   git remote add origin https://github.com/yourusername/ai-image-workshop.git
   git push -u origin main
   ```

2. **Vercelでインポート**
   - [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
   - 「Add New...」→ 「Project」→ GitHubリポジトリを選択
   - 「Import」をクリック

3. **環境変数の設定**
   - 「Environment Variables」セクション
   - 以下を追加：
     - `GEMINI_API_KEY`: あなたのAPIキー
     - （または`REPLICATE_API_TOKEN`など使用するAPIに応じて）

4. **デプロイ**
   - 「Deploy」をクリック
   - 2-3分で完了！
   - URLが表示されます（例: `https://ai-image-workshop.vercel.app`）

### デプロイ後の確認

1. 表示されたURLにアクセス
2. 画像生成が動作するか確認
3. 参加者にURLを共有

## 🔧 その他のデプロイオプション

### Render（無料・簡単）

1. [Render](https://render.com)にアカウント作成
2. 「New Web Service」→ GitHubリポジトリを選択
3. 環境変数を設定
4. 「Create Web Service」
5. URLが発行されます

### Railway（無料枠あり）

1. [Railway](https://railway.app)にアカウント作成
2. 「New Project」→ GitHubリポジトリを選択
3. 環境変数を設定
4. 自動デプロイされます

## ⚙️ 環境変数の設定方法（デプロイ時）

各デプロイサービスで環境変数を設定：

| サービス | 設定場所 |
|---------|---------|
| Vercel | Project Settings → Environment Variables |
| Render | Environment → Environment Variables |
| Railway | Variablesタブ |

設定する変数：
- `GEMINI_API_KEY` (Gemini APIを使用する場合)
- `REPLICATE_API_TOKEN` (Replicate APIを使用する場合)

## 💡 おすすめの運用方法

**研修会用なら：**

1. **事前準備（研修会前日まで）**
   - APIキーを取得
   - Vercelでデプロイ（5分）
   - 動作確認

2. **研修会当日**
   - URLを参加者に共有（チャットやスライドに貼り付け）
   - 参加者は各自のPCでアクセス
   - 全員が同時に画像生成を体験

3. **研修会終了後**
   - デプロイを削除してもOK（無料枠内ならそのままでもOK）

**メリット：**
- ✅ 参加者全員が簡単にアクセスできる
- ✅ 運営者のPCに負担がかからない
- ✅ 安定して動作する
- ✅ セットアップが簡単

## 🔒 セキュリティについて

- APIキーは環境変数で管理（コードには含めない）
- `.env`ファイルは`.gitignore`に含まれているので、GitHubには上がりません
- デプロイ時は環境変数として設定するだけ
- 研修会用なので、一度使ったら破棄する想定

