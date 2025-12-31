let uploadedImageFile = null;

// ドラッグ&ドロップ処理
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('drop-zone').classList.add('drag-over');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('drop-zone').classList.remove('drag-over');
}

function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('drop-zone').classList.remove('drag-over');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

// ファイル選択処理
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// ファイル処理（共通）
function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        showError('画像ファイルを選択してください');
        return;
    }
    
    uploadedImageFile = file;
    
    // プレビュー表示
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('image-preview');
        const previewImg = document.getElementById('preview-image');
        previewImg.src = e.target.result;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// 画像を削除
function removeImage() {
    uploadedImageFile = null;
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('file-input').value = '';
}

// 画像生成（統合）
async function generateImage() {
    const prompt = document.getElementById('prompt-input').value.trim();
    
    if (!prompt && !uploadedImageFile) {
        showError('テキストまたは画像のいずれかを入力してください');
        return;
    }
    
    showLoading();
    hideError();
    resetResult();
    
    try {
        let response;
        
        if (uploadedImageFile) {
            // 画像あり（画像 + テキスト）
            const formData = new FormData();
            formData.append('image', uploadedImageFile);
            formData.append('prompt', prompt || 'この画像を基に新しい画像を生成してください');
            
            response = await fetch('/api/generate-from-image', {
                method: 'POST',
                body: formData
            });
        } else {
            // テキストのみ
            response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt })
            });
        }
        
        // レスポンスがJSONかどうかを確認
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('❌ JSON以外のレスポンスを受信:', text.substring(0, 200));
            throw new Error(`サーバーエラーが発生しました（ステータス: ${response.status}）。APIエンドポイントが正しく設定されているか確認してください。`);
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            const errorMsg = data.error || data.details || '生成に失敗しました';
            throw new Error(errorMsg);
        }
        
        if (data.success && data.image) {
            showResult(data.image, data.mimeType || 'image/png');
        } else {
            throw new Error('画像データが取得できませんでした');
        }
    } catch (error) {
        console.error('エラー:', error);
        let errorMessage = error.message || '画像生成中にエラーが発生しました';
        
        // エラーメッセージをより分かりやすく
        if (errorMessage.includes('APIキー')) {
            errorMessage = 'APIキーが設定されていません。Vercelの環境変数を確認してください。';
        } else if (errorMessage.includes('画像生成に失敗')) {
            errorMessage = '画像生成に失敗しました。APIキーが正しく設定されているか、使用しているAPIが画像生成をサポートしているか確認してください。';
        }
        
        showError(errorMessage);
    } finally {
        hideLoading();
    }
}

// 結果表示
function showResult(imageBase64, mimeType) {
    const resultPlaceholder = document.getElementById('result-placeholder');
    const resultContent = document.getElementById('result-content');
    const resultImage = document.getElementById('result-image');
    
    // プレースホルダーを隠して、結果を表示
    resultPlaceholder.style.display = 'none';
    resultContent.style.display = 'block';
    
    // base64データを画像として表示
    resultImage.src = `data:${mimeType};base64,${imageBase64}`;
    resultImage.onload = function() {
        // スクロールして結果を表示（モバイルの場合）
        if (window.innerWidth < 1024) {
            resultContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
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

// トップにスクロール
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ローディング表示
function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

// エラー表示
function showError(message) {
    const errorToast = document.getElementById('error-toast');
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = message;
    errorToast.style.display = 'flex';
    
    // 5秒後に自動で閉じる
    setTimeout(() => {
        hideError();
    }, 5000);
}

function hideError() {
    document.getElementById('error-toast').style.display = 'none';
}

// 結果リセット
function resetResult() {
    const resultPlaceholder = document.getElementById('result-placeholder');
    const resultContent = document.getElementById('result-content');
    const resultImage = document.getElementById('result-image');
    
    resultPlaceholder.style.display = 'flex';
    resultContent.style.display = 'none';
    resultImage.src = '';
}
