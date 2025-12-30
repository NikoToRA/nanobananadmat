require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Multer設定（メモリストレージ）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Gemini API初期化
if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️ 警告: GEMINI_API_KEYが設定されていません。.envファイルにAPIキーを設定してください。');
}

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// テキストから画像生成
app.post('/api/generate', async (req, res) => {
  try {
    if (!genAI) {
      return res.status(500).json({ error: 'APIキーが設定されていません。.envファイルにGEMINI_API_KEYを設定してください。' });
    }

    const { prompt } = req.body;
    
    if (!prompt || prompt.trim() === '') {
      return res.status(400).json({ error: 'プロンプトが入力されていません' });
    }

    // Gemini 2.0 Flash Exp（画像生成対応モデル）を使用
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    // 画像生成リクエスト
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: `以下のプロンプトで画像を生成してください: ${prompt}` }]
      }]
    });

    const response = await result.response;
    const imageData = response.candidates[0].content.parts[0].inlineData;
    
    if (!imageData) {
      // 画像生成が直接サポートされていない場合、テキスト返却の可能性
      return res.status(500).json({ 
        error: '画像生成に失敗しました。Gemini APIの画像生成機能をご確認ください。',
        details: response.text()
      });
    }

    res.json({
      success: true,
      image: imageData.data, // base64エンコードされた画像
      mimeType: imageData.mimeType
    });
  } catch (error) {
    console.error('生成エラー:', error);
    res.status(500).json({ 
      error: '画像生成中にエラーが発生しました',
      details: error.message 
    });
  }
});

// 画像から画像生成（画像 + プロンプト）
app.post('/api/generate-from-image', upload.single('image'), async (req, res) => {
  try {
    if (!genAI) {
      return res.status(500).json({ error: 'APIキーが設定されていません。.envファイルにGEMINI_API_KEYを設定してください。' });
    }

    const { prompt } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({ error: '画像がアップロードされていません' });
    }

    if (!prompt || prompt.trim() === '') {
      return res.status(400).json({ error: 'プロンプトが入力されていません' });
    }

    // 画像をbase64に変換
    const imageBase64 = imageFile.buffer.toString('base64');
    const mimeType = imageFile.mimetype;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: mimeType
            }
          },
          {
            text: `この画像を基に、以下のプロンプトに従って新しい画像を生成してください: ${prompt}`
          }
        ]
      }]
    });

    const response = await result.response;
    const imageData = response.candidates[0].content.parts[0].inlineData;

    if (!imageData) {
      return res.status(500).json({ 
        error: '画像生成に失敗しました',
        details: response.text()
      });
    }

    res.json({
      success: true,
      image: imageData.data,
      mimeType: imageData.mimeType
    });
  } catch (error) {
    console.error('生成エラー:', error);
    res.status(500).json({ 
      error: '画像生成中にエラーが発生しました',
      details: error.message 
    });
  }
});

// ルートパス（デプロイ用）
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// サーバー起動（ローカル環境のみ）
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 サーバーが起動しました: http://localhost:${PORT}`);
    console.log(`📝 APIキーが設定されているか確認してください`);
  });
}

// Vercel用にエクスポート
module.exports = app;

