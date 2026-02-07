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
let imageDrawX = 0;          // posição x no canvas
let imageDrawY = 0;          // posição y no canvas
let imageDrawW = 0;          // largura no canvas
let imageDrawH = 0;          // altura no canvas
let imageCropX = 0;          // source x (crop da imagem original)
let imageCropY = 0;          // source y
let imageCropW = 0;          // source width
let imageCropH = 0;          // source height

const IMAGE_CHANCE = 0.13;           // 13% por checagem
const IMAGE_CHECK_INTERVAL = 3000;   // checar a cada 3s
const IMAGE_DURATION_MIN = 3000;     // duração mínima (ms)
const IMAGE_DURATION_MAX = 13000;    // duração máxima (ms)
const IMAGE_FADE_MIN = 500;          // fade mínimo (ms)
const IMAGE_FADE_MAX = 1500;         // fade máximo (ms)
const IMAGE_SCALE_MIN = 0.13;        // 13% do lado menor do canvas
const IMAGE_SCALE_MAX = 0.70;        // 70% do lado menor do canvas
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

        const iw = img.naturalWidth;
        const ih = img.naturalHeight;

        // Crop aleatório: 30-100% da imagem, aspect ratio aleatório
        const cropFraction = 0.3 + Math.random() * 0.7;
        const cropAspect = 0.5 + Math.random() * 1.5; // 1:2 até 3:2
        // Calcular crop source rect
        let cw = iw * cropFraction;
        let ch = cw / cropAspect;
        if (ch > ih * cropFraction) {
            ch = ih * cropFraction;
            cw = ch * cropAspect;
        }
        // Clamp to image bounds
        cw = Math.min(cw, iw);
        ch = Math.min(ch, ih);
        imageCropW = cw;
        imageCropH = ch;
        imageCropX = Math.random() * (iw - cw);
        imageCropY = Math.random() * (ih - ch);

        // Tamanho no canvas: baseado no lado menor do canvas
        const canvasMin = Math.min(width, height);
        const targetSize = canvasMin * (IMAGE_SCALE_MIN + Math.random() * (IMAGE_SCALE_MAX - IMAGE_SCALE_MIN));
        const cropMax = Math.max(cw, ch);
        const scale = targetSize / cropMax;

        imageDrawW = cw * scale;
        imageDrawH = ch * scale;

        // Posição aleatória respeitando margem
        const mx = width * IMAGE_MARGIN;
        const my = height * IMAGE_MARGIN;
        imageDrawX = mx + Math.random() * Math.max(0, width - 2 * mx - imageDrawW);
        imageDrawY = my + Math.random() * Math.max(0, height - 2 * my - imageDrawH);

        imageState = 'fading_in';
        imageStartTime = millis();
        imageFadeDuration = IMAGE_FADE_MIN + Math.random() * (IMAGE_FADE_MAX - IMAGE_FADE_MIN);
        imageShowDuration = IMAGE_DURATION_MIN + Math.random() * (IMAGE_DURATION_MAX - IMAGE_DURATION_MIN);

        const pct = (targetSize / canvasMin * 100).toFixed(0);
        const cropPct = (cropFraction * 100).toFixed(0);
        console.log(`🖼️ Imagem: ${material.id} (${pct}%, crop ${cropPct}%, ${(imageShowDuration / 1000).toFixed(1)}s)`);
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
    // drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh) — crop source → canvas dest
    drawingContext.drawImage(currentImage,
        imageCropX, imageCropY, imageCropW, imageCropH,
        imageDrawX, imageDrawY, imageDrawW, imageDrawH);
    drawingContext.restore();
}
