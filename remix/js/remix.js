// ═══════════════════════════════════════════════════════════════════════════════
// REMIX.JS - Orquestração Principal
// Sonhário v1.1 - Visualização Audiovisual em Tempo Real
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// ESTADO GLOBAL
// ─────────────────────────────────────────────────────────────────────────────

let isPlaying = false;
let playButton;
let materialsData = [];
let currentMaterial = null;

// Double-buffer: dois vídeos para corte seco sem flash preto
let frontVideo = null;  // vídeo visível (desenhado por cima)
let backVideo = null;   // próximo vídeo (pré-carregado, desenhado por baixo)
let backVideoReady = false; // back video tem dados suficientes para tocar

// ─────────────────────────────────────────────────────────────────────────────
// CANVAS SIZING — 16:9 at 85% viewport (matches Cascata)
// ─────────────────────────────────────────────────────────────────────────────

function calc16x9(fraction) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let w = vw * fraction;
    let h = w * 9 / 16;
    if (h > vh * fraction) {
        h = vh * fraction;
        w = h * 16 / 9;
    }
    return { w: Math.floor(w), h: Math.floor(h) };
}

function applyCanvasSize() {
    const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
    const container = document.getElementById('p5-container');

    if (isFS) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        container.style.width = w + 'px';
        container.style.height = h + 'px';
        resizeCanvas(w, h);
    } else {
        const { w, h } = calc16x9(0.85);
        container.style.width = w + 'px';
        container.style.height = h + 'px';
        resizeCanvas(w, h);
    }
}

function toggleFullscreen() {
    const container = document.getElementById('p5-container');
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
        (container.requestFullscreen || container.webkitRequestFullscreen).call(container);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SETUP - Inicializar p5.js e Carregar Dados
// ─────────────────────────────────────────────────────────────────────────────

function setup() {
    const { w, h } = calc16x9(0.85);
    const container = document.getElementById('p5-container');
    container.style.width = w + 'px';
    container.style.height = h + 'px';

    const cnv = createCanvas(w, h);
    cnv.parent('p5-container');

    // Referência ao botão PLAY
    playButton = document.getElementById('play-button');
    playButton.addEventListener('mousedown', () => spinIdleParticles());
    playButton.addEventListener('mouseup', togglePlayPause);
    playButton.addEventListener('mouseenter', () => { playBtnHovered = true; });
    playButton.addEventListener('mouseleave', () => { playBtnHovered = false; });

    // Fullscreen button
    document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', () => applyCanvasSize());
    document.addEventListener('webkitfullscreenchange', () => applyCanvasSize());

    // Volume control
    const volumeSlider = document.getElementById('volume-slider');
    const volumeBtn = document.getElementById('volume-btn');
    volumeSlider.addEventListener('input', () => {
        setMasterVolume(volumeSlider.value / 100);
        volumeBtn.classList.toggle('muted', volumeSlider.value === '0');
    });
    volumeBtn.addEventListener('click', () => {
        const muted = toggleMasterMute();
        volumeBtn.classList.toggle('muted', muted);
        volumeSlider.value = muted ? 0 : masterVolumeBeforeMute * 100;
    });

    // Position fullscreen btn relative to canvas
    applyCanvasSize();

    // Criar dois elementos <video> HTML5 (ocultos do DOM) para double-buffer
    frontVideo = createHiddenVideo();
    backVideo = createHiddenVideo();

    // Partículas idle (base count, atualiza após carregar materiais)
    initIdleParticles(0);

    // Carregar materiais do JSON
    loadMaterials();

    console.log('Setup p5.js completo');
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAW - Loop Principal
// ─────────────────────────────────────────────────────────────────────────────

function draw() {
    // Fundo preto
    background(0);

    // Partículas idle (pré-play e durante fade out)
    updateIdleParticles();

    // Camada 1: Renderizar vídeos (back primeiro, front por cima)
    if (isPlaying) {
        drawVideoElement(backVideo);   // atrás
        drawVideoElement(frontVideo);  // na frente
        checkVideoSwap();
        checkAudioCrossfade();
        updateImageLayer();
    }

}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO - Detectar Ambiente (Local vs Online)
// ─────────────────────────────────────────────────────────────────────────────

let MATERIALS_PATH = '';
let ENVIRONMENT = 'unknown'; // 'local' | 'online'

const SUPABASE_URL = 'https://nxanctcrqdcbbuhlktzb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW5jdGNycWRjYmJ1aGxrdHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNTUxOTEsImV4cCI6MjA4NDkzMTE5MX0.TkeaWGSR0MM0_VLJaOMFchdbkkM_fRPM5Zr53g7R7zk';

async function detectEnvironment() {
    // Tenta vários paths para descobrir onde está o materiais.json
    const paths = [
        '../materiais.json',           // Live Server em /remix/
        '/visualizacao/materiais.json', // Servidor em /Site_Claude/
        '../../visualizacao/materiais.json' // Outro cenário
    ];

    for (const path of paths) {
        try {
            const response = await fetch(path);
            if (response.ok) {
                MATERIALS_PATH = path;
                ENVIRONMENT = 'local';
                console.log(`✅ Ambiente LOCAL detectado: MATERIALS_PATH="${path}"`);
                return;
            }
        } catch (e) {
            // continue
        }
    }

    // Se não encontrou localmente, assume que vai vir de Supabase (online)
    ENVIRONMENT = 'online';
    console.log('✅ Ambiente ONLINE detectado (Supabase)');
}

/**
 * Converte um path de mídia para URL acessível
 * - Se for URL completa (http/https): usa direto
 * - Se for path local absoluto (/Users/...): converte para relativo
 * - Online: Supabase retorna URLs completas automaticamente
 */
function getMediaPath(mediaPath) {
    // Se já é uma URL completa (Supabase), retorna direto
    if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
        return mediaPath;
    }

    // Se é um path local absoluto, converte para relativo
    if (mediaPath.startsWith('/Users/fitipe/Desktop/Site_Claude/')) {
        // Descobre qual é o VIDEO_BASE_PATH correto baseado no MATERIALS_PATH
        let videoBasePath = '../../';

        if (MATERIALS_PATH === '../materiais.json') {
            videoBasePath = '../../';  // Live Server em /remix/
        } else if (MATERIALS_PATH === '/visualizacao/materiais.json') {
            videoBasePath = '/';       // Servidor em /Site_Claude/
        } else if (MATERIALS_PATH === '../../visualizacao/materiais.json') {
            videoBasePath = '../../';  // Outro cenário
        }

        return mediaPath.replace(/\/Users\/fitipe\/Desktop\/Site_Claude\//g, videoBasePath);
    }

    // Fallback: retorna como está
    return mediaPath;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOAD MATERIALS - Carregar JSON de Materiais
// ─────────────────────────────────────────────────────────────────────────────

async function loadMaterials() {
    try {
        // Detectar ambiente primeiro
        await detectEnvironment();

        if (ENVIRONMENT === 'local') {
            // Carregar JSON local
            const response = await fetch(MATERIALS_PATH);
            if (!response.ok) throw new Error('Falha ao carregar materiais.json');

            const data = await response.json();

            materialsData = data.materiais.filter(m =>
                (m.tipo === 'sonhos' || m.tipo === 'prospeccoes') &&
                m.has_processing === true &&
                m.video_path !== null &&
                m.audio_10s_path !== null
            );
        } else {
            // Carregar do Supabase via REST API
            // Inclui legacy (só vídeo/imagem) - áudio é filtrado depois no JS
            const query = new URLSearchParams({
                'tipo': 'in.(sonhos,prospeccoes,legacy)',
                'video_url': 'not.is.null',
                'select': 'external_id,tipo,video_url,audio_10s_url,audio_espectral_url,imagem_url,texto_url'
            });

            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/materials?${query}`,
                {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    }
                }
            );

            if (!response.ok) throw new Error(`Supabase: ${response.status}`);

            const rows = await response.json();

            // Mapear campos Supabase → formato interno
            materialsData = rows.map(r => ({
                id: r.external_id,
                tipo: r.tipo,
                video_path: r.video_url,
                audio_10s_path: r.audio_10s_url,
                audio_espectral_path: r.audio_espectral_url,
                image_path: r.imagem_url,
                texto_path: r.texto_url
            }));
        }

        console.log(`✅ Carregados ${materialsData.length} materiais válidos para Remix (${ENVIRONMENT})`);
        console.log('Tipos:', [...new Set(materialsData.map(m => m.tipo))]);

        // Reiniciar partículas com contagem real (exclui legacy)
        const nonLegacyCount = materialsData.filter(m => m.tipo !== 'legacy').length;
        initIdleParticles(nonLegacyCount);

    } catch (error) {
        console.error('❌ Erro ao carregar materiais:', error);
        console.warn('Operando em modo de demonstração (sem dados)');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAY/PAUSE TOGGLE
// ─────────────────────────────────────────────────────────────────────────────

function togglePlayPause() {
    if (!isPlaying) {
        // Iniciar playback
        startPlayback();
    } else {
        // Pausar playback
        pausePlayback();
    }
}

function startPlayback() {
    if (materialsData.length === 0) {
        console.warn('⚠️ Nenhum material disponível para tocar');
        return;
    }

    isPlaying = true;
    backVideoReady = false;
    playButton.classList.add('hidden');
    document.getElementById('controls-group').classList.remove('hidden');

    console.log('▶️ Iniciando playback...');

    // Camada 1: Vídeos - carregar front e pre-carregar back imediatamente
    loadVideoInto(frontVideo, getRandomMaterial(), true);

    // Camada 2+3: Áudio 10s com crossfade + espectral
    startAudioLayer();

    // Camada 4: Imagens overlay
    startImageLayer();
}

function pausePlayback() {
    isPlaying = false;
    playButton.classList.remove('hidden');
    document.getElementById('controls-group').classList.add('hidden');

    console.log('⏸️ Pausando playback...');

    frontVideo.pause();
    backVideo.pause();

    // Camada 2+3: Parar áudio
    stopAudioLayer();

    // Camada 4: Parar imagens
    stopImageLayer();
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSIVIDADE - Redimensionar Canvas
// ─────────────────────────────────────────────────────────────────────────────

function windowResized() {
    applyCanvasSize();
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS - Funções Auxiliares
// ─────────────────────────────────────────────────────────────────────────────

function getRandomMaterial() {
    if (materialsData.length === 0) return null;
    return materialsData[Math.floor(Math.random() * materialsData.length)];
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMADA 1: DOUBLE-BUFFER DE VÍDEOS (corte seco sem flash)
// ─────────────────────────────────────────────────────────────────────────────

function createHiddenVideo() {
    const vid = document.createElement('video');
    vid.style.display = 'none';
    vid.muted = true;
    vid.playsInline = true;
    vid.preload = 'auto';
    vid.crossOrigin = 'anonymous';
    document.body.appendChild(vid);
    return vid;
}

/**
 * Carrega um material em um elemento de vídeo.
 * isFront: se true, quando pronto inicia preload do próximo no back.
 */
function loadVideoInto(videoEl, material, isFront) {
    if (!material) return;

    const videoPath = getMediaPath(material.video_path);
    videoEl._speed = 0.8 + Math.random() * 0.4;

    const slot = isFront ? 'FRONT' : 'BACK';
    console.log(`🎬 ${material.id} → ${slot} (${videoEl._speed.toFixed(2)}x)`);

    // Limpar handlers anteriores (evita acúmulo)
    videoEl.oncanplaythrough = null;
    videoEl.onerror = null;
    videoEl.onended = null;

    videoEl.src = videoPath;
    videoEl.playbackRate = videoEl._speed;
    videoEl.load();

    if (isFront) {
        // Front: quando pronto, começa a tocar e pre-carrega o back
        videoEl.oncanplaythrough = () => {
            videoEl.oncanplaythrough = null;
            console.log(`✅ Pronto: ${material.id} (${videoEl.videoWidth}x${videoEl.videoHeight})`);
            fadeOutIdleParticles();
            preloadNextVideo();
        };
    } else {
        // Back: apenas marca como pronto quando tem dados suficientes
        videoEl.oncanplaythrough = () => {
            videoEl.oncanplaythrough = null;
            backVideoReady = true;
            console.log(`⏭️ Back pronto: ${material.id}`);
        };
    }

    videoEl.onerror = () => {
        const err = videoEl.error;
        console.error(`❌ Erro vídeo: ${err ? err.message : '?'}`);
        // Tentar outro material
        loadVideoInto(videoEl, getRandomMaterial(), isFront);
    };

    // Só toca imediatamente se for front — back apenas pré-carrega
    if (isFront) {
        const p = videoEl.play();
        if (p) p.catch(e => console.error('❌ Play:', e.message));
    }
}

/**
 * Pre-carrega o próximo vídeo no backVideo imediatamente
 */
function preloadNextVideo() {
    backVideoReady = false;
    loadVideoInto(backVideo, getRandomMaterial(), false);
}

/**
 * Chamado a cada frame: verifica se front acabou e back está pronto para swap.
 * Enquanto back não estiver pronto, front mantém seu último frame visível.
 */
function checkVideoSwap() {
    if (!frontVideo || frontVideo.readyState < 2) return;

    // Front acabou?
    if (frontVideo.ended) {
        if (backVideoReady && backVideo.readyState >= 3) {
            doVideoSwap();
        }
        // Senão: front mantém último frame visível até back ficar pronto
    }
}

/**
 * Executa a troca: back vira front, antigo front é limpo e vira back
 */
function doVideoSwap() {
    console.log('🔄 Swap: back → front');

    const oldFront = frontVideo;
    frontVideo = backVideo;
    backVideo = oldFront;

    // Novo front: começar do início e tocar
    frontVideo.currentTime = 0;
    const p = frontVideo.play();
    if (p) p.catch(e => console.error('❌ Play swap:', e.message));

    // Limpar antigo front (agora back) para reutilização
    backVideo.oncanplaythrough = null;
    backVideo.onerror = null;
    backVideo.onended = null;
    backVideo.pause();
    backVideo.removeAttribute('src');
    backVideo.load();

    backVideoReady = false;
    currentMaterial = null;

    // Pre-carregar o próximo imediatamente
    preloadNextVideo();
}

/**
 * Desenha um videoElement no canvas mantendo aspect ratio
 */
function drawVideoElement(videoEl) {
    if (!videoEl || videoEl.readyState < 2) return;

    const vw = videoEl.videoWidth;
    const vh = videoEl.videoHeight;
    if (vw === 0 || vh === 0) return;

    const videoAspect = vw / vh;
    const canvasAspect = width / height;

    let dw, dh, ox, oy;

    if (canvasAspect > videoAspect) {
        dh = height;
        dw = dh * videoAspect;
    } else {
        dw = width;
        dh = dw / videoAspect;
    }

    ox = (width - dw) / 2;
    oy = (height - dh) / 2;

    drawingContext.drawImage(videoEl, ox, oy, dw, dh);
}

// ═══════════════════════════════════════════════════════════════════════════════
