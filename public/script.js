let currentTab = 'text';
let uploadedImageFile = null;

// タブ切り替え
function switchTab(tab, element) {
    currentTab = tab;
    
    // タブボタンの状態を更新
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    if (element) {
        element.classList.add('active');
    }
    
    // タブコンテンツの表示を切り替え
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (tab === 'text') {
        document.getElementById('text-tab').classList.add('active');
    } else {
        document.getElementById('image-tab').classList.add('active');
    }
    
    // 結果をリセット
    resetResult();
}

// 画像アップロード処理
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    uploadedImageFile = file;
    
    // プレビュー表示
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('preview-image').src = e.target.result;
        document.getElementById('preview-section').style.display = 'block';
        document.getElementById('generate-image-btn').disabled = false;
    };
    reader.readAsDataURL(file);
}

// テキストから画像生成
async function generateFromText() {
    const prompt = document.getElementById('prompt').value.trim();
    
    if (!prompt) {
        showError('プロンプトを入力してください');
        return;
    }
    
    showLoading();
    hideError();
    resetResult();
    
    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || '生成に失敗しました');
        }
        
        if (data.success && data.image) {
            showResult(data.image, data.mimeType || 'image/png');
        } else {
            throw new Error('画像データが取得できませんでした');
        }
    } catch (error) {
        console.error('エラー:', error);
        showError(error.message || '画像生成中にエラーが発生しました');
    } finally {
        hideLoading();
    }
}

// 画像から画像生成
async function generateFromImage() {
    const prompt = document.getElementById('image-prompt').value.trim();
    
    if (!prompt) {
        showError('プロンプトを入力してください');
        return;
    }
    
    if (!uploadedImageFile) {
        showError('画像をアップロードしてください');
        return;
    }
    
    showLoading();
    hideError();
    resetResult();
    
    try {
        const formData = new FormData();
        formData.append('image', uploadedImageFile);
        formData.append('prompt', prompt);
        
        const response = await fetch('/api/generate-from-image', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || '生成に失敗しました');
        }
        
        if (data.success && data.image) {
            showResult(data.image, data.mimeType || 'image/png');
        } else {
            throw new Error('画像データが取得できませんでした');
        }
    } catch (error) {
        console.error('エラー:', error);
        showError(error.message || '画像生成中にエラーが発生しました');
    } finally {
        hideLoading();
    }
}

// 結果表示
function showResult(imageBase64, mimeType) {
    const resultSection = document.getElementById('result-section');
    const resultImage = document.getElementById('result-image');
    
    // base64データを画像として表示
    resultImage.src = `data:${mimeType};base64,${imageBase64}`;
    resultImage.onload = function() {
        resultSection.style.display = 'block';
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
}

// 画像ダウンロード
function downloadImage() {
    const resultImage = document.getElementById('result-image');
    const src = resultImage.src;
    
    if (!src || src === '') {
        showError('ダウンロードする画像がありません');
        return;
    }
    
    // 画像をダウンロード
    const link = document.createElement('a');
    link.href = src;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ローディング表示
function showLoading() {
    document.getElementById('loading').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// エラー表示
function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = `❌ ${message}`;
    errorDiv.style.display = 'block';
}

function hideError() {
    document.getElementById('error').style.display = 'none';
}

// 結果リセット
function resetResult() {
    document.getElementById('result-section').style.display = 'none';
    document.getElementById('result-image').src = '';
}

