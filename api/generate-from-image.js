require('dotenv').config();
const multer = require('multer');

// Multer設定（メモリストレージ）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// multer middleware
const runMiddleware = (req, res, fn) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
};

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
    console.log('📝 画像+テキスト生成リクエスト受信');
    
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ APIキーが設定されていません');
      return res.status(500).json({ error: 'APIキーが設定されていません。Vercelの環境変数にGEMINI_API_KEYを設定してください。' });
    }

    // Multerでファイルを処理
    await runMiddleware(req, res, upload.single('image').bind(upload));

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
    return res.json({
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
    
    return res.status(500).json({ 
      error: '画像生成中にエラーが発生しました',
      details: error.message,
      errorType: error.name
    });
  }
};

