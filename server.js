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

// 静的ファイルの配信（APIルートより前）
app.use(express.static(path.join(__dirname, 'public')));

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
    console.log('📝 画像生成リクエスト受信');
    console.log('API Key exists:', !!process.env.GEMINI_API_KEY);
    
    if (!genAI) {
      console.error('❌ Gemini API初期化エラー: APIキーが設定されていません');
      return res.status(500).json({ error: 'APIキーが設定されていません。Vercelの環境変数にGEMINI_API_KEYを設定してください。' });
    }

    const { prompt } = req.body;
    console.log('📝 プロンプト:', prompt);
    
    if (!prompt || prompt.trim() === '') {
      return res.status(400).json({ error: 'プロンプトが入力されていません' });
    }

    console.log('🤖 Gemini API呼び出し開始...');
    // Gemini 2.0 Flash Exp（画像生成対応モデル）を使用
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    // 画像生成リクエスト
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: `以下のプロンプトで画像を生成してください: ${prompt}` }]
      }]
    });

    console.log('✅ Gemini APIレスポンス受信');
    const response = await result.response;
    console.log('📄 レスポンス構造:', {
      hasCandidates: !!response.candidates,
      candidatesLength: response.candidates?.length,
      firstCandidateParts: response.candidates?.[0]?.content?.parts?.length
    });
    
    // レスポンスの詳細をログ出力
    if (response.candidates && response.candidates[0]) {
      const firstPart = response.candidates[0].content.parts[0];
      console.log('📄 最初のpart:', {
        hasText: !!firstPart.text,
        hasInlineData: !!firstPart.inlineData,
        textPreview: firstPart.text?.substring(0, 100),
        inlineDataType: firstPart.inlineData?.mimeType
      });
    }
    
    const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    
    if (!imageData) {
      // 画像生成が直接サポートされていない場合、テキスト返却の可能性
      const errorText = response.candidates?.[0]?.content?.parts?.[0]?.text || '画像データが返されませんでした';
      console.error('❌ 画像データが見つかりません:', errorText);
      return res.status(500).json({ 
        error: '画像生成に失敗しました。Gemini APIの画像生成機能をご確認ください。',
        details: errorText,
        responseType: response.candidates?.[0]?.content?.parts?.[0]?.text ? 'text' : 'unknown'
      });
    }

    console.log('✅ 画像データ取得成功');
    res.json({
      success: true,
      image: imageData.data, // base64エンコードされた画像
      mimeType: imageData.mimeType
    });
  } catch (error) {
    console.error('❌ 生成エラー詳細:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      error: '画像生成中にエラーが発生しました',
      details: error.message,
      errorType: error.name
    });
  }
});

// 画像から画像生成（画像 + プロンプト）
app.post('/api/generate-from-image', upload.single('image'), async (req, res) => {
  try {
    console.log('📝 画像+テキスト生成リクエスト受信');
    
    if (!genAI) {
      console.error('❌ Gemini API初期化エラー');
      return res.status(500).json({ error: 'APIキーが設定されていません。Vercelの環境変数にGEMINI_API_KEYを設定してください。' });
    }

    const { prompt } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({ error: '画像がアップロードされていません' });
    }

    if (!prompt || prompt.trim() === '') {
      return res.status(400).json({ error: 'プロンプトが入力されていません' });
    }

    console.log('📝 プロンプト:', prompt);
    console.log('🖼️ 画像ファイル:', {
      size: imageFile.size,
      mimetype: imageFile.mimetype,
      originalname: imageFile.originalname
    });

    // 画像をbase64に変換
    const imageBase64 = imageFile.buffer.toString('base64');
    const mimeType = imageFile.mimetype;

    console.log('🤖 Gemini API呼び出し開始（画像+テキスト）...');
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

    console.log('✅ Gemini APIレスポンス受信');
    const response = await result.response;
    console.log('📄 レスポンス構造:', {
      hasCandidates: !!response.candidates,
      candidatesLength: response.candidates?.length
    });
    
    const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;

    if (!imageData) {
      const errorText = response.candidates?.[0]?.content?.parts?.[0]?.text || '画像データが返されませんでした';
      console.error('❌ 画像データが見つかりません:', errorText);
      return res.status(500).json({ 
        error: '画像生成に失敗しました',
        details: errorText
      });
    }

    console.log('✅ 画像データ取得成功');
    res.json({
      success: true,
      image: imageData.data,
      mimeType: imageData.mimeType
    });
  } catch (error) {
    console.error('❌ 生成エラー詳細:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      error: '画像生成中にエラーが発生しました',
      details: error.message,
      errorType: error.name
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

