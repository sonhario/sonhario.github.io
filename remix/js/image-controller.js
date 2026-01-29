// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE-CONTROLLER.JS - Camada 4: Imagens com Overlay Aleatório
// Sonhário v1.1
//
// Imagens PNG aparecem sobre o vídeo com probabilidade de 15% por segundo.
// Duração 1-7s, fade in/out de 200-500ms.
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// ESTADO
// ─────────────────────────────────────────────────────────────────────────────

let imageLayerActive = false;
let imageState = 'idle'; // 'idle' | 'fading_in' | 'showing' | 'fading_out'
let imageMaterials = []; // materiais que têm image_path

let currentImage = null;     // HTMLImageElement carregado
let imageStartTime = 0;      // millis() do início da fase atual
let imageFadeDuration = 0;   // duração do fade atual (ms)
let imageShowDuration = 0;   // duração da exibição (ms)
let lastImageCheck = 0;      // millis() da última checagem de probabilidade
let imageDrawX = 0;          // posição x calculada no trigger
let imageDrawY = 0;          // posição y
let imageDrawW = 0;          // largura calculada
let imageDrawH = 0;          // altura calculada

const IMAGE_CHANCE = 0.13;           // 13% por checagem
const IMAGE_CHECK_INTERVAL = 3000;   // checar a cada 3s
const IMAGE_DURATION_MIN = 3000;     // duração mínima (ms)
const IMAGE_DURATION_MAX = 13000;    // duração máxima (ms)
const IMAGE_FADE_MIN = 500;          // fade mínimo (ms)
const IMAGE_FADE_MAX = 1500;         // fade máximo (ms)
const IMAGE_SCALE_MIN = 0.07;        // 7% do lado maior do canvas
const IMAGE_SCALE_MAX = 0.70;        // 70% do lado maior do canvas
const IMAGE_MARGIN = 0.07;           // margem de 7% em todos os lados

// ─────────────────────────────────────────────────────────────────────────────
// START / STOP (chamados pelo remix.js)
// ─────────────────────────────────────────────────────────────────────────────

function startImageLayer() {
    imageMaterials = materialsData.filter(m => m.image_path !== null);
    console.log(`🖼️ ${imageMaterials.length} materiais com imagem`);

    imageLayerActive = true;
    imageState = 'idle';
    lastImageCheck = millis();
}

function stopImageLayer() {
    imageLayerActive = false;
    imageState = 'idle';
    currentImage = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE - Chamar a cada frame no draw()
// ─────────────────────────────────────────────────────────────────────────────

function updateImageLayer() {
    if (!imageLayerActive || imageMaterials.length === 0) return;

    const now = millis();

    switch (imageState) {
        case 'idle':
            // Checar probabilidade a cada intervalo
            if (now - lastImageCheck >= IMAGE_CHECK_INTERVAL) {
                lastImageCheck = now;
                if (Math.random() < IMAGE_CHANCE) {
                    triggerImageOverlay();
                }
            }
            break;

        case 'fading_in': {
            const elapsed = now - imageStartTime;
            const alpha = Math.min(elapsed / imageFadeDuration, 1);
            drawImageOverlay(alpha);

            if (elapsed >= imageFadeDuration) {
                imageState = 'showing';
                imageStartTime = now;
            }
            break;
        }

        case 'showing': {
            drawImageOverlay(1);
            const elapsed = now - imageStartTime;

            if (elapsed >= imageShowDuration) {
                imageState = 'fading_out';
                imageStartTime = now;
                imageFadeDuration = IMAGE_FADE_MIN + Math.random() * (IMAGE_FADE_MAX - IMAGE_FADE_MIN);
            }
            break;
        }

        case 'fading_out': {
            const elapsed = now - imageStartTime;
            const alpha = Math.max(1 - elapsed / imageFadeDuration, 0);
            drawImageOverlay(alpha);

            if (elapsed >= imageFadeDuration) {
                imageState = 'idle';
                currentImage = null;
                lastImageCheck = now;
            }
            break;
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER - Iniciar uma aparição de imagem
// ─────────────────────────────────────────────────────────────────────────────

function triggerImageOverlay() {
    const material = imageMaterials[Math.floor(Math.random() * imageMaterials.length)];
    if (!material) return;

    const imgPath = getMediaPath(material.image_path);

    const img = new Image();
    img.onload = () => {
        currentImage = img;

        // Tamanho: lado maior da imagem ocupa 8-80% do lado maior do canvas
        const canvasMax = Math.max(width, height);
        const targetSize = canvasMax * (IMAGE_SCALE_MIN + Math.random() * (IMAGE_SCALE_MAX - IMAGE_SCALE_MIN));

        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        const imgMax = Math.max(iw, ih);
        const scale = targetSize / imgMax;

        imageDrawW = iw * scale;
        imageDrawH = ih * scale;

        // Posição aleatória respeitando margem de 8%
        const mx = width * IMAGE_MARGIN;
        const my = height * IMAGE_MARGIN;
        const minX = mx;
        const maxX = width - mx - imageDrawW;
        const minY = my;
        const maxY = height - my - imageDrawH;

        imageDrawX = minX + Math.random() * Math.max(0, maxX - minX);
        imageDrawY = minY + Math.random() * Math.max(0, maxY - minY);

        imageState = 'fading_in';
        imageStartTime = millis();
        imageFadeDuration = IMAGE_FADE_MIN + Math.random() * (IMAGE_FADE_MAX - IMAGE_FADE_MIN);
        imageShowDuration = IMAGE_DURATION_MIN + Math.random() * (IMAGE_DURATION_MAX - IMAGE_DURATION_MIN);

        const pct = (targetSize / canvasMax * 100).toFixed(0);
        console.log(`🖼️ Imagem: ${material.id} (${pct}%, ${(imageShowDuration / 1000).toFixed(1)}s)`);
    };
    img.onerror = () => {
        console.error(`❌ Imagem: falha ao carregar ${material.id}`);
    };
    img.src = imgPath;
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAW - Desenhar imagem com alpha sobre o canvas
// ─────────────────────────────────────────────────────────────────────────────

function drawImageOverlay(alpha) {
    if (!currentImage || alpha <= 0) return;

    drawingContext.save();
    drawingContext.globalAlpha = alpha;
    drawingContext.drawImage(currentImage, imageDrawX, imageDrawY, imageDrawW, imageDrawH);
    drawingContext.restore();
}
