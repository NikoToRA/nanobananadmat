# 代替画像生成APIの実装方法

Gemini APIが画像生成をサポートしていない場合の代替案です。

## オプション1: Replicate API（推奨）

ReplicateはStable Diffusionなどの画像生成モデルを簡単に使えるAPIサービスです。無料枠もあります。

### セットアップ

1. `package.json`に追加：
```json
"replicate": "^0.25.0"
```

2. `.env`に追加：
```
REPLICATE_API_TOKEN=your_replicate_token_here
```

3. `server.js`のテキストから画像生成部分を以下のように変更：

```javascript
const Replicate = require('replicate');
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

// テキストから画像生成
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt || prompt.trim() === '') {
      return res.status(400).json({ error: 'プロンプトが入力されていません' });
    }

    const output = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt: prompt,
          width: 1024,
          height: 1024
        }
      }
    );

    // outputは画像URLの配列
    const imageUrl = Array.isArray(output) ? output[0] : output;
    
    // URLから画像を取得してbase64に変換
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');

    res.json({
      success: true,
      image: imageBase64,
      mimeType: 'image/png'
    });
  } catch (error) {
    console.error('生成エラー:', error);
    res.status(500).json({ 
      error: '画像生成中にエラーが発生しました',
      details: error.message 
    });
  }
});
```

**Replicate APIトークンの取得方法:**
1. [Replicate](https://replicate.com/)にアカウント作成
2. [API Tokens](https://replicate.com/account/api-tokens)ページでトークンを取得

## オプション2: Hugging Face Inference API

Hugging FaceもStable Diffusionなどのモデルを提供しています。

### セットアップ

1. `.env`に追加：
```
HUGGINGFACE_API_KEY=your_huggingface_token_here
```

2. `server.js`に追加：

```javascript
// テキストから画像生成（Hugging Face）
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt || prompt.trim() === '') {
      return res.status(400).json({ error: 'プロンプトが入力されていません' });
    }

    const response = await fetch(
      "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.statusText}`);
    }

    const imageBuffer = await response.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');

    res.json({
      success: true,
      image: imageBase64,
      mimeType: 'image/png'
    });
  } catch (error) {
    console.error('生成エラー:', error);
    res.status(500).json({ 
      error: '画像生成中にエラーが発生しました',
      details: error.message 
    });
  }
});
```

**Hugging Face APIキーの取得方法:**
1. [Hugging Face](https://huggingface.co/)にアカウント作成
2. [Settings > Access Tokens](https://huggingface.co/settings/tokens)でトークンを作成

## どれを選ぶべきか？

- **Replicate**: 最も簡単で安定している。無料枠あり。推奨。
- **Hugging Face**: 無料枠が大きいが、初回実行時にモデルロードが必要（時間がかかる場合がある）
- **Gemini**: Googleのサービスだが、画像生成機能が未確定

研修会用なら、**Replicate**が最も確実で簡単です。

