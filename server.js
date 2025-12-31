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

// 利用可能なモデル一覧を取得する関数
async function listAvailableModels() {
    if (!genAI) return null;
    try {
        const models = await genAI.listModels();
        console.log('📋 利用可能なモデル一覧:');
        models.forEach(model => {
            console.log(`  - ${model.name}`);
        });
        return models;
    } catch (error) {
        console.error('モデル一覧取得エラー:', error.message);
        return null;
    }
}

// 使用するモデル名（環境変数で変更可能）
// Gemini 3.0 NanobananaPro を優先、なければデフォルト
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.0-nanobanana-pro';

// テキストから画像生成（Google Imagen APIを使用）
app.post('/api/generate', async (req, res) => {
  try {
    console.log('📝 画像生成リクエスト受信');
    console.log('API Key exists:', !!process.env.GEMINI_API_KEY);
    
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ Gemini API初期化エラー: APIキーが設定されていません');
      return res.status(500).json({ error: 'APIキーが設定されていません。Vercelの環境変数にGEMINI_API_KEYを設定してください。' });
    }

    const { prompt } = req.body;
    console.log('📝 プロンプト:', prompt);
    
    if (!prompt || prompt.trim() === '') {
      return res.status(400).json({ error: 'プロンプトが入力されていません' });
    }

    console.log('🤖 Google Imagen API呼び出し開始...');
    
    // Google Imagen API (imagen-3.0-generate-001) を使用
    // これはGemini APIとは別のエンドポイントです
    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages?key=${apiKey}`;
    
    console.log('📋 使用API: Imagen 3.0 (imagen-3.0-generate-001)');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        number_of_images: 1,
        aspect_ratio: '1:1'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Imagen APIエラー:', response.status, errorText);
      
      // モデル名が違う場合は他のモデル名を試す
      if (response.status === 404) {
        console.log('⚠️ imagen-3.0-generate-001が見つかりません。利用可能なモデルを確認します...');
        // 利用可能なモデル一覧を取得
        const modelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        try {
          const modelsResponse = await fetch(modelsUrl);
          if (modelsResponse.ok) {
            const modelsData = await modelsResponse.json();
            console.log('📋 利用可能なモデル:');
            if (modelsData.models) {
              modelsData.models.forEach(model => {
                if (model.name && model.name.includes('imagen') || model.name.includes('image')) {
                  console.log(`  - ${model.name}`);
                }
              });
            }
          }
        } catch (e) {
          console.error('モデル一覧取得エラー:', e.message);
        }
      }
      
      return res.status(response.status).json({ 
        error: '画像生成に失敗しました',
        details: errorText,
        status: response.status
      });
    }

    const data = await response.json();
    console.log('✅ Imagen APIレスポンス受信');
    console.log('📄 レスポンス構造:', Object.keys(data));
    
    // Imagen APIのレスポンス形式に応じて画像データを取得
    let imageBase64 = null;
    let mimeType = 'image/png';
    
    if (data.generatedImages && data.generatedImages[0]) {
      // base64画像データがある場合
      if (data.generatedImages[0].imageBase64) {
        imageBase64 = data.generatedImages[0].imageBase64;
      } else if (data.generatedImages[0].imageUrl) {
        // URLの場合、画像を取得してbase64に変換
        const imageResponse = await fetch(data.generatedImages[0].imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        imageBase64 = Buffer.from(imageBuffer).toString('base64');
      }
    } else if (data.images && data.images[0]) {
      // 別のレスポンス形式
      if (data.images[0].base64) {
        imageBase64 = data.images[0].base64;
      }
    }
    
    if (!imageBase64) {
      console.error('❌ 画像データが見つかりません。レスポンス:', JSON.stringify(data).substring(0, 500));
      return res.status(500).json({ 
        error: '画像データが取得できませんでした',
        details: 'Imagen APIからのレスポンス形式が想定と異なります',
        responseStructure: Object.keys(data)
      });
    }

    console.log('✅ 画像データ取得成功');
    res.json({
      success: true,
      image: imageBase64,
      mimeType: mimeType
    });
  } catch (error) {
    // エラーの詳細を全てログ出力
    console.error('❌ 生成エラー詳細:');
    console.error('Message:', error.message);
    console.error('Error Type:', error.name);
    if (error.stack) {
      console.error('Stack:', error.stack.substring(0, 500));
    }
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
    
    res.status(500).json({ 
      error: '画像生成中にエラーが発生しました',
      details: error.message,
      errorType: error.name
    });
  }
});

// 画像から画像生成（画像 + プロンプト）
// Imagen APIを使用して画像を参照した生成を行います
app.post('/api/generate-from-image', upload.single('image'), async (req, res) => {
  try {
    console.log('📝 画像+テキスト生成リクエスト受信');
    
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ APIキーが設定されていません');
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

    console.log('🤖 Google Imagen API呼び出し開始（画像+テキスト）...');
    
    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages?key=${apiKey}`;
    
    // 画像を参照したプロンプトで生成
    const enhancedPrompt = `${prompt}, inspired by the style and composition of the reference image`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        reference_image: {
          image_bytes: imageBase64,
          mime_type: imageFile.mimetype
        },
        number_of_images: 1,
        aspect_ratio: '1:1'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Imagen APIエラー:', response.status, errorText);
      return res.status(response.status).json({ 
        error: '画像生成に失敗しました',
        details: errorText
      });
    }

    const data = await response.json();
    console.log('✅ Imagen APIレスポンス受信');
    
    let resultBase64 = null;
    if (data.generatedImages && data.generatedImages[0]) {
      if (data.generatedImages[0].imageBase64) {
        resultBase64 = data.generatedImages[0].imageBase64;
      } else if (data.generatedImages[0].imageUrl) {
        const imageResponse = await fetch(data.generatedImages[0].imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        resultBase64 = Buffer.from(imageBuffer).toString('base64');
      }
    }
    
    if (!resultBase64) {
      console.error('❌ 画像データが見つかりません');
      return res.status(500).json({ 
        error: '画像データが取得できませんでした'
      });
    }

    console.log('✅ 画像データ取得成功');
    res.json({
      success: true,
      image: resultBase64,
      mimeType: 'image/png'
    });
  } catch (error) {
    console.error('❌ 生成エラー詳細:');
    console.error('Message:', error.message);
    console.error('Error Type:', error.name);
    if (error.stack) {
      console.error('Stack:', error.stack.substring(0, 500));
    }
    
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

