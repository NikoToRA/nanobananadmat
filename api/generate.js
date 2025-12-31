require('dotenv').config();

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

    // ✅ Geminiの画像生成モデルを v1beta:generateContent で呼ぶ
    // ListModelsで確認できた image系モデル例:
    // - models/gemini-2.5-flash-image
    // - models/gemini-2.5-flash-image-preview
    // - models/gemini-3-pro-image-preview
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_IMAGE_MODEL || 'models/gemini-2.5-flash-image';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;

    console.log('🤖 Gemini画像生成(v1beta generateContent) 呼び出し開始...');
    console.log('📋 使用モデル:', modelName);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `次の指示で画像を1枚生成してください。画像のみ返してください。\n\n${prompt}`
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
        details: errorText,
        status: response.status
      });
    }

    const data = await response.json();
    console.log('✅ Gemini画像生成レスポンス受信');

    // 画像inlineDataを探索
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(p => p.inlineData && p.inlineData.data);
    const imageBase64 = imagePart?.inlineData?.data || null;
    const mimeType = imagePart?.inlineData?.mimeType || 'image/png';
    
    if (!imageBase64) {
      console.error('❌ 画像データ(inlineData)が見つかりません。レスポンス:', JSON.stringify(data).substring(0, 800));
      return res.status(500).json({ 
        error: '画像データが取得できませんでした',
        details: 'Gemini画像生成モデルが画像を返しませんでした（テキストのみの可能性）'
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

