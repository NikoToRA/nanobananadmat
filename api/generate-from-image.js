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

    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_IMAGE_MODEL || 'models/gemini-2.5-flash-image';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;

    console.log('🤖 Gemini画像生成(v1beta generateContent) 呼び出し開始（画像+テキスト）...');
    console.log('📋 使用モデル:', modelName);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: imageBase64,
                  mimeType: imageFile.mimetype
                }
              },
              {
                text: `この画像を参考に、次の指示で画像を1枚生成してください。画像のみ返してください。\n\n${prompt}`
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini画像生成APIエラー:', response.status, errorText);
      return res.status(response.status).json({ 
        error: '画像生成に失敗しました',
        details: errorText
      });
    }

    const data = await response.json();
    console.log('✅ Gemini画像生成レスポンス受信');

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(p => p.inlineData && p.inlineData.data);
    const resultBase64 = imagePart?.inlineData?.data || null;
    const resultMime = imagePart?.inlineData?.mimeType || 'image/png';
    
    if (!resultBase64) {
      console.error('❌ 画像データ(inlineData)が見つかりません。レスポンス:', JSON.stringify(data).substring(0, 800));
      return res.status(500).json({ 
        error: '画像データが取得できませんでした'
      });
    }

    console.log('✅ 画像データ取得成功');
    return res.json({
      success: true,
      image: resultBase64,
      mimeType: resultMime
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

