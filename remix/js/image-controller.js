// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE-CONTROLLER.JS - Camadas 4-6: 3 Camadas de Imagem Independentes
// Sonhário v1.2
//
// 3 camadas independentes de imagem sobre o vídeo.
// 85% crop aleatório (20-80%), 15% imagem inteira (40-70% canvas).
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

const IMAGE_LAYER_COUNT = 3;
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
// ESTADO
// ─────────────────────────────────────────────────────────────────────────────

let imageLayerActive = false;
let imageMaterials = [];

// Array de 3 camadas, cada uma com estado independente
const imageLayers = [];

function createLayerState() {
    return {
        state: 'idle',
        image: null,
        startTime: 0,
        fadeDuration: 0,
        showDuration: 0,
        lastCheck: 0,
        drawX: 0, drawY: 0, drawW: 0, drawH: 0,
        cropX: 0, cropY: 0, cropW: 0, cropH: 0
    };
}

for (let i = 0; i < IMAGE_LAYER_COUNT; i++) {
    const layer = createLayerState();
    layer.cropChance = (i === 0) ? 0.60 : 0.85; // camada 0: mais inteiras
    imageLayers.push(layer);
}

// ─────────────────────────────────────────────────────────────────────────────
// START / STOP (chamados pelo remix.js)
// ─────────────────────────────────────────────────────────────────────────────

function startImageLayer() {
    imageMaterials = materialsData.filter(m => m.image_path !== null);
    console.log(`🖼️ ${imageMaterials.length} materiais com imagem (${IMAGE_LAYER_COUNT} camadas)`);

    imageLayerActive = true;
    const now = millis();
    for (const layer of imageLayers) {
        layer.state = 'idle';
        layer.image = null;
        layer.lastCheck = now;
    }
}

function stopImageLayer() {
    imageLayerActive = false;
    for (const layer of imageLayers) {
        layer.state = 'idle';
        layer.image = null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE - Chamar a cada frame no draw()
// ─────────────────────────────────────────────────────────────────────────────

function updateImageLayer() {
    if (!imageLayerActive || imageMaterials.length === 0) return;

    const now = millis();

    for (const layer of imageLayers) {
        updateSingleLayer(layer, now);
    }
}

function updateSingleLayer(L, now) {
    switch (L.state) {
        case 'idle':
            if (now - L.lastCheck >= IMAGE_CHECK_INTERVAL) {
                L.lastCheck = now;
                if (Math.random() < IMAGE_CHANCE) {
                    triggerLayerOverlay(L);
                }
            }
            break;

        case 'fading_in': {
            const elapsed = now - L.startTime;
            const alpha = Math.min(elapsed / L.fadeDuration, 1);
            drawLayerOverlay(L, alpha);

            if (elapsed >= L.fadeDuration) {
                L.state = 'showing';
                L.startTime = now;
            }
            break;
        }

        case 'showing': {
            drawLayerOverlay(L, 1);
            const elapsed = now - L.startTime;

            if (elapsed >= L.showDuration) {
                L.state = 'fading_out';
                L.startTime = now;
                L.fadeDuration = IMAGE_FADE_MIN + Math.random() * (IMAGE_FADE_MAX - IMAGE_FADE_MIN);
            }
            break;
        }

        case 'fading_out': {
            const elapsed = now - L.startTime;
            const alpha = Math.max(1 - elapsed / L.fadeDuration, 0);
            drawLayerOverlay(L, alpha);

            if (elapsed >= L.fadeDuration) {
                L.state = 'idle';
                L.image = null;
                L.lastCheck = now;
            }
            break;
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER - Iniciar uma aparição de imagem em uma camada
// ─────────────────────────────────────────────────────────────────────────────

function triggerLayerOverlay(L) {
    const material = imageMaterials[Math.floor(Math.random() * imageMaterials.length)];
    if (!material) return;

    const imgPath = getMediaPath(material.image_path);

    const img = new Image();
    img.onload = () => {
        L.image = img;

        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        const canvasMin = Math.min(width, height);
        const doCrop = Math.random() < L.cropChance;
        let logLabel;

        if (doCrop) {
            // 85%: crop 20-80% da imagem, aspect ratio aleatório
            const cropFraction = 0.2 + Math.random() * 0.6;
            const cropAspect = 0.25 + Math.random() * 3.75; // 0.25 (vertical 1:4) a 4.0 (horizontal 4:1)
            let cw = iw * cropFraction;
            let ch = cw / cropAspect;
            if (ch > ih * cropFraction) {
                ch = ih * cropFraction;
                cw = ch * cropAspect;
            }
            cw = Math.min(cw, iw);
            ch = Math.min(ch, ih);
            L.cropW = cw;
            L.cropH = ch;
            L.cropX = Math.random() * (iw - cw);
            L.cropY = Math.random() * (ih - ch);

            const targetSize = canvasMin * (IMAGE_SCALE_MIN + Math.random() * (IMAGE_SCALE_MAX - IMAGE_SCALE_MIN));
            const cropMax = Math.max(cw, ch);
            const scale = targetSize / cropMax;
            L.drawW = cw * scale;
            L.drawH = ch * scale;

            logLabel = `crop ${(cropFraction * 100).toFixed(0)}%, ${(targetSize / canvasMin * 100).toFixed(0)}%`;
        } else {
            // 15%: imagem inteira, 40-70% do lado menor do canvas
            L.cropX = 0;
            L.cropY = 0;
            L.cropW = iw;
            L.cropH = ih;

            const targetSize = canvasMin * (0.4 + Math.random() * 0.3);
            const imgMax = Math.max(iw, ih);
            const scale = targetSize / imgMax;
            L.drawW = iw * scale;
            L.drawH = ih * scale;

            logLabel = `inteira ${(targetSize / canvasMin * 100).toFixed(0)}%`;
        }

        // Posição aleatória respeitando margem
        const mx = width * IMAGE_MARGIN;
        const my = height * IMAGE_MARGIN;
        L.drawX = mx + Math.random() * Math.max(0, width - 2 * mx - L.drawW);
        L.drawY = my + Math.random() * Math.max(0, height - 2 * my - L.drawH);

        L.state = 'fading_in';
        L.startTime = millis();
        L.fadeDuration = IMAGE_FADE_MIN + Math.random() * (IMAGE_FADE_MAX - IMAGE_FADE_MIN);
        L.showDuration = IMAGE_DURATION_MIN + Math.random() * (IMAGE_DURATION_MAX - IMAGE_DURATION_MIN);

        console.log(`🖼️ Imagem: ${material.id} (${logLabel}, ${(L.showDuration / 1000).toFixed(1)}s)`);
    };
    img.onerror = () => {
        console.error(`❌ Imagem: falha ao carregar ${material.id}`);
    };
    img.src = imgPath;
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAW - Desenhar imagem com alpha sobre o canvas
// ─────────────────────────────────────────────────────────────────────────────

function drawLayerOverlay(L, alpha) {
    if (!L.image || alpha <= 0) return;

    drawingContext.save();
    drawingContext.globalAlpha = alpha;
    drawingContext.drawImage(L.image,
        L.cropX, L.cropY, L.cropW, L.cropH,
        L.drawX, L.drawY, L.drawW, L.drawH);
    drawingContext.restore();
}
