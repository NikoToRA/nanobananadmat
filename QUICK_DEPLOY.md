# ⚡ Vercelへの超簡単デプロイ手順（5分で完了）

## ステップ1: Vercel CLIをインストール

```bash
npm i -g vercel
```

## ステップ2: ログイン

```bash
vercel login
```

ブラウザが開くので、GitHubアカウントでログイン

## ステップ3: デプロイ

プロジェクトフォルダで実行：

```bash
cd "/Users/suguruhirayama/Desktop/DMAT研修"
vercel
```

**質問に答える：**
- Set up and deploy? → `Y`
- Which scope? → 自分のアカウントを選択
- Link to existing project? → `N`
- Project name? → `ai-image-workshop`（任意の名前）
- Directory? → `./`（そのままEnter）
- Override settings? → `N`

## ステップ4: 環境変数を設定

デプロイ完了後、Vercelのダッシュボードで：

1. プロジェクトを開く
2. 「Settings」→ 「Environment Variables」
3. 以下を追加：

### Gemini APIを使う場合：
```
Name: GEMINI_API_KEY
Value: あなたのGemini APIキー
Environment: Production, Preview, Development（すべて選択）
```

### Replicate APIを使う場合（推奨）：
```
Name: REPLICATE_API_TOKEN
Value: あなたのReplicate APIトークン
Environment: Production, Preview, Development（すべて選択）
```

4. 「Save」をクリック

## ステップ5: 再デプロイ

環境変数を設定したら、再デプロイ：

```bash
vercel --prod
```

または、Vercelダッシュボードで「Redeploy」をクリック

## ステップ6: URLを確認

デプロイ完了後、URLが表示されます：

```
✅ Production: https://ai-image-workshop.vercel.app
```

このURLを参加者に共有するだけ！

## 🎉 完了！

これで研修会で使用できます。

---

## 補足：Replicate APIに切り替える場合

Gemini APIが動作しない場合、`server.js`を修正してReplicate APIを使うことができます。

詳細は `ALTERNATIVE_API.md` を参照してください。

