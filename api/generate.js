require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async (req, res) => {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
                if (model.name && (model.name.includes('imagen') || model.name.includes('image'))) {
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
    return res.json({
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
    
    return res.status(500).json({ 
      error: '画像生成中にエラーが発生しました',
      details: error.message,
      errorType: error.name
    });
  }
};

