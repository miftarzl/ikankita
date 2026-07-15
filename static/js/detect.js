// ===== Detect Page JS – with Bounding Box + Mobile =====

const API_URL = '/api/detect';
const loadingOverlay = document.getElementById('loadingOverlay');

// ========================
// TAB SWITCHING
// ========================
const tabs = document.querySelectorAll('.tab-btn');
const panels = document.querySelectorAll('.detect-panel');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
    });
});

// Check URL params for initial tab
const params = new URLSearchParams(window.location.search);
if (params.get('mode') === 'upload') {
    document.getElementById('tab-upload').click();
}

// ========================
// BOUNDING BOX DRAWING
// ========================
function drawBoundingBoxes(canvas, detections, naturalW, naturalH) {
    const ctx = canvas.getContext('2d');
    // NOTE: do NOT clearRect here — the image is already drawn on this canvas

    const scaleX = canvas.width / naturalW;
    const scaleY = canvas.height / naturalH;


    detections.forEach(det => {
        const [x1, y1, x2, y2] = det.bbox;
        const sx1 = x1 * scaleX;
        const sy1 = y1 * scaleY;
        const sw = (x2 - x1) * scaleX;
        const sh = (y2 - y1) * scaleY;

        const isFresh = det.class === 'Fresh';
        const color = isFresh ? '#10b981' : '#ef4444';
        const labelText = isFresh ? 'Segar' : 'Tidak Segar';

        // Glowing shadow
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;

        // Box border
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(2, canvas.width * 0.004);
        ctx.strokeRect(sx1, sy1, sw, sh);

        // Semi-transparent fill inside box
        ctx.shadowBlur = 0;
        ctx.fillStyle = isFresh ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)';
        ctx.fillRect(sx1, sy1, sw, sh);

        // Corner accent – top-left
        const cornerLen = Math.min(sw, sh) * 0.15;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = Math.max(1.5, canvas.width * 0.003);
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(sx1, sy1 + cornerLen);
        ctx.lineTo(sx1, sy1);
        ctx.lineTo(sx1 + cornerLen, sy1);
        ctx.stroke();
        // top-right
        ctx.beginPath();
        ctx.moveTo(sx1 + sw - cornerLen, sy1);
        ctx.lineTo(sx1 + sw, sy1);
        ctx.lineTo(sx1 + sw, sy1 + cornerLen);
        ctx.stroke();
        // bottom-left
        ctx.beginPath();
        ctx.moveTo(sx1, sy1 + sh - cornerLen);
        ctx.lineTo(sx1, sy1 + sh);
        ctx.lineTo(sx1 + cornerLen, sy1 + sh);
        ctx.stroke();
        // bottom-right
        ctx.beginPath();
        ctx.moveTo(sx1 + sw - cornerLen, sy1 + sh);
        ctx.lineTo(sx1 + sw, sy1 + sh);
        ctx.lineTo(sx1 + sw, sy1 + sh - cornerLen);
        ctx.stroke();

        // Label pill background
        ctx.shadowBlur = 0;
        ctx.font = `bold ${Math.max(11, canvas.width * 0.022)}px Inter, sans-serif`;
        const textW = ctx.measureText(labelText).width;
        const pillH = Math.max(22, canvas.width * 0.045);
        const pillPad = 10;
        const pillY = sy1 - pillH - 4 < 0 ? sy1 + 4 : sy1 - pillH - 4;

        // Pill
        ctx.fillStyle = color;
        const radius = pillH / 2;
        const pillX = sx1;
        const pillW = textW + pillPad * 2;
        ctx.beginPath();
        ctx.moveTo(pillX + radius, pillY);
        ctx.lineTo(pillX + pillW - radius, pillY);
        ctx.arcTo(pillX + pillW, pillY, pillX + pillW, pillY + pillH, radius);
        ctx.lineTo(pillX + pillW, pillY + pillH - radius);
        ctx.arcTo(pillX + pillW, pillY + pillH, pillX + pillW - radius, pillY + pillH, radius);
        ctx.lineTo(pillX + radius, pillY + pillH);
        ctx.arcTo(pillX, pillY + pillH, pillX, pillY + pillH - radius, radius);
        ctx.lineTo(pillX, pillY + radius);
        ctx.arcTo(pillX, pillY, pillX + radius, pillY, radius);
        ctx.closePath();
        ctx.fill();

        // Label text
        ctx.fillStyle = '#fff';
        ctx.fillText(labelText, pillX + pillPad, pillY + pillH * 0.68);
    });
}

// ========================
// RESULT BUILDER
// ========================
function buildResultHTML(data) {
    const { status, label, detections } = data;

    const icons = { fresh: '🐟', not_fresh: '🤢', uncertain: '⚠️', not_fish: '❌' };
    const labels = { fresh: 'Ikan Segar', not_fresh: 'Ikan Tidak Segar', uncertain: 'Deteksi Tidak Pasti', not_fish: 'Bukan Ikan' };
    const statusClass = status === 'not_fresh' ? 'not-fresh' : status === 'not_fish' ? 'not-fish' : status;
    const adviceMap = {
        fresh: '✅ Ikan ini <strong>layak dikonsumsi</strong>. Kondisi masih segar dan baik.',
        not_fresh: '❌ Ikan ini <strong>tidak direkomendasikan</strong> untuk dikonsumsi. Kondisi sudah tidak segar.',
        uncertain: '⚠️ Tingkat kepercayaan rendah. Coba ambil foto lebih dekat dengan pencahayaan lebih baik.',
        not_fish: '🔍 Objek tidak terdeteksi sebagai ikan. Pastikan ikan terlihat jelas di kamera.'
    };

    let detHTML = '';

    return `
        <div class="result-bbox-preview" id="bboxPreview">
            <canvas id="bboxCanvas"></canvas>
        </div>
        <div class="result-status-icon ${statusClass}">${icons[status] || '❓'}</div>
        <div class="result-label ${statusClass}">${labels[status] || 'Unknown'}</div>
        <div class="result-message">${adviceMap[status] || data.message}</div>
        ${detHTML}
        <div class="result-try-again">
            <button class="btn-secondary" onclick="resetAll()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
                Coba Lagi
            </button>
        </div>`;
}

function showResult(cardId, placeholderId, data, imageDataURL) {
    const card = document.getElementById(cardId);
    const placeholder = document.getElementById(placeholderId);
    if (!card) return;

    card.innerHTML = buildResultHTML(data);
    card.classList.remove('hidden');
    if (placeholder) placeholder.classList.add('hidden');

    // Render image + bounding boxes if we have an image and detections
    const preview = document.getElementById('bboxPreview');
    const canvas = document.getElementById('bboxCanvas');

    if (imageDataURL && data.detections && data.detections.length > 0 && data.image_size) {
        const img = new Image();
        img.onload = () => {
            // Set canvas to natural image size
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            // Draw image first
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Draw bounding boxes
            drawBoundingBoxes(canvas, data.detections, data.image_size.width, data.image_size.height);

            preview.classList.remove('hidden');
        };
        img.src = imageDataURL;
    } else if (imageDataURL) {
        // Show image without boxes (not_fish or uncertain)
        const img = new Image();
        img.onload = () => {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Dim effect for non-fish
            if (data.status === 'not_fish') {
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'rgba(100,116,139,0.3)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            preview.classList.remove('hidden');
        };
        img.src = imageDataURL;
    } else {
        preview.classList.add('hidden');
    }
}

function resetAll() {
    // Reset camera result
    const camCard = document.getElementById('resultCard');
    const camPH = document.getElementById('resultPlaceholder');
    if (camCard) { camCard.classList.add('hidden'); camCard.innerHTML = ''; }
    if (camPH) camPH.classList.remove('hidden');

    // Reset upload result
    const upCard = document.getElementById('uploadResultCard');
    const upPH = document.getElementById('uploadResultPlaceholder');
    if (upCard) { upCard.classList.add('hidden'); upCard.innerHTML = ''; }
    if (upPH) upPH.classList.remove('hidden');
    resetUpload();
}

function setLoading(visible) {
    if (visible) loadingOverlay.classList.remove('hidden');
    else loadingOverlay.classList.add('hidden');
}

async function sendImageForDetection(base64Image, resultCardId, placeholderId) {
    setLoading(true);
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });
        if (!response.ok) throw new Error('Server error: ' + response.status);
        const data = await response.json();
        showResult(resultCardId, placeholderId, data, base64Image);
    } catch (err) {
        showResult(resultCardId, placeholderId, {
            status: 'not_fish',
            message: 'Terjadi kesalahan: ' + err.message,
            label: null,
            detections: [],
            image_size: null
        }, base64Image);
    } finally {
        setLoading(false);
    }
}

// ========================
// CAMERA
// ========================
let stream = null;
let currentFacingMode = 'environment';
let cameraRunning = false;

const videoEl = document.getElementById('videoElement');
const cameraCanvas = document.getElementById('cameraCanvas');

function showState(state) {
    ['cam-permission', 'cam-denied', 'cam-active'].forEach(id => {
        document.getElementById(id)?.classList.add('hidden');
    });
    document.getElementById(`cam-${state}`)?.classList.remove('hidden');
}

async function startCamera(facingMode = 'environment') {
    try {
        if (stream) stream.getTracks().forEach(t => t.stop());
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        videoEl.srcObject = stream;
        currentFacingMode = facingMode;
        cameraRunning = true;
        showState('active');
    } catch (err) {
        cameraRunning = false;
        showState('denied');
    }
}

document.getElementById('startCamera')?.addEventListener('click', () => startCamera());

document.getElementById('captureBtn')?.addEventListener('click', () => {
    if (!videoEl || !stream) return;
    const ctx = cameraCanvas.getContext('2d');
    cameraCanvas.width = videoEl.videoWidth;
    cameraCanvas.height = videoEl.videoHeight;
    ctx.drawImage(videoEl, 0, 0);
    const base64 = cameraCanvas.toDataURL('image/jpeg', 0.92);

    // Flash effect
    const overlay = document.querySelector('.camera-overlay');
    if (overlay) {
        overlay.style.background = 'rgba(255,255,255,0.35)';
        setTimeout(() => { overlay.style.background = ''; }, 160);
    }

    // On mobile: scroll to result section
    setTimeout(() => {
        const rs = document.getElementById('resultSection') || document.getElementById('resultCard');
        rs?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);

    sendImageForDetection(base64, 'resultCard', 'resultPlaceholder');
});

document.getElementById('switchCamera')?.addEventListener('click', () => {
    startCamera(currentFacingMode === 'environment' ? 'user' : 'environment');
});

document.getElementById('stopCamera')?.addEventListener('click', () => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    cameraRunning = false;
    showState('permission');
});

// ========================
// UPLOAD
// ========================
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const previewImage = document.getElementById('previewImage');
const dropzoneContent = document.getElementById('dropzoneContent');
const dropzonePreview = document.getElementById('dropzonePreview');
const analyzeBtn = document.getElementById('analyzeBtn');
const removeImageBtn = document.getElementById('removeImage');
let selectedFileDataURL = null;

function loadPreview(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        selectedFileDataURL = e.target.result;
        previewImage.src = e.target.result;
        dropzoneContent.classList.add('hidden');
        dropzonePreview.classList.remove('hidden');
        analyzeBtn.disabled = false;
    };
    reader.readAsDataURL(file);
}

function resetUpload() {
    selectedFileDataURL = null;
    if (fileInput) fileInput.value = '';
    if (previewImage) previewImage.src = '';
    dropzonePreview?.classList.add('hidden');
    dropzoneContent?.classList.remove('hidden');
    if (analyzeBtn) analyzeBtn.disabled = true;
}

fileInput?.addEventListener('change', e => { if (e.target.files[0]) loadPreview(e.target.files[0]); });
removeImageBtn?.addEventListener('click', e => { e.stopPropagation(); resetUpload(); });

dropzone?.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone?.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) loadPreview(file);
});

analyzeBtn?.addEventListener('click', () => {
    if (!selectedFileDataURL) return;
    sendImageForDetection(selectedFileDataURL, 'uploadResultCard', 'uploadResultPlaceholder');

    // On mobile: scroll to result section after analysis
    setTimeout(() => {
        document.getElementById('uploadResultCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
});

// Paste support
document.addEventListener('paste', e => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
                document.getElementById('tab-upload').click();
                loadPreview(file);
            }
            break;
        }
    }
});
