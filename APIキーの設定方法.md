# 🔑 APIキーの設定方法

APIキーは**2つの場所**で設定する必要があります。

## 📍 設定場所1: ローカル開発環境（テスト用）

研修会で使う前に、自分のPCで動作確認したい場合に設定します。

### 手順

1. **プロジェクトフォルダに `.env` ファイルを作成**

```bash
cd "/Users/suguruhirayama/Desktop/DMAT研修"
```

2. **`.env` ファイルを開いて、以下を記入**

#### Replicate APIを使う場合（推奨）：
```env
REPLICATE_API_TOKEN=あなたのReplicate APIトークン
PORT=3000
```

#### Gemini APIを使う場合：
```env
GEMINI_API_KEY=あなたのGemini APIキー
PORT=3000
```

3. **保存**

`.env` ファイルは既に `.gitignore` に含まれているので、GitHubには上がりません（安全です）。

4. **ローカルでテスト**

```bash
npm start
```

ブラウザで `http://localhost:3000` にアクセスして動作確認。

---

## 📍 設定場所2: Vercel（本番環境・研修会用）

研修会で参加者が使うWebサイトに設定します。

### 手順

1. **Vercelダッシュボードを開く**
   - https://vercel.com/dashboard
   - デプロイ済みのプロジェクトをクリック

2. **Settings → Environment Variables を開く**

3. **環境変数を追加**

#### Replicate APIを使う場合（推奨）：
- **Name**: `REPLICATE_API_TOKEN`
- **Value**: あなたのReplicate APIトークン
- **Environment**: ✅ Production ✅ Preview ✅ Development（すべてチェック）

#### Gemini APIを使う場合：
- **Name**: `GEMINI_API_KEY`
- **Value**: あなたのGemini APIキー
- **Environment**: ✅ Production ✅ Preview ✅ Development（すべてチェック）

4. **「Save」をクリック**

5. **再デプロイ**（重要！）
   - 「Deployments」タブを開く
   - 最新のデプロイメントの「⋯」メニュー → 「Redeploy」
   - 「Redeploy」をクリック

---

## ✅ 確認方法

### ローカル環境で確認
```bash
npm start
# ブラウザで http://localhost:3000 にアクセス
# 画像生成を試してみる
```

### Vercel環境で確認
1. デプロイされたURLにアクセス（例: `https://nanobananadmat.vercel.app`）
2. 画像生成を試してみる
3. エラーが出ないか確認

---

## 🔒 セキュリティ注意事項

- ✅ `.env` ファイルはGitHubにプッシュされません（`.gitignore` で除外済み）
- ✅ Vercelの環境変数も安全に管理されます
- ✅ APIキーは他の人に見せないでください

---

## 🆘 トラブルシューティング

### 環境変数が反映されない
→ Vercelで環境変数を設定した後、**必ず再デプロイ**してください。

### エラーメッセージが出る
→ 環境変数の名前が正しいか確認：
- Replicate API: `REPLICATE_API_TOKEN`
- Gemini API: `GEMINI_API_KEY`

（大文字小文字も正確に）

