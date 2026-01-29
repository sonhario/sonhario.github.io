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
let nextAlreadyQueued = false; // evita enfileirar múltiplas vezes

const PRELOAD_AHEAD = 0.5; // segundos antes do fim para iniciar o próximo

// ─────────────────────────────────────────────────────────────────────────────
// SETUP - Inicializar p5.js e Carregar Dados
// ─────────────────────────────────────────────────────────────────────────────

function setup() {
    // Criar canvas responsivo
    let container = document.getElementById('p5-container');
    let w = container.clientWidth;
    let h = container.clientHeight;

    createCanvas(w, h);

    // Referência ao botão PLAY
    playButton = document.getElementById('play-button');
    playButton.addEventListener('click', togglePlayPause);

    // Criar dois elementos <video> HTML5 (ocultos do DOM) para double-buffer
    frontVideo = createHiddenVideo();
    backVideo = createHiddenVideo();

    // Carregar materiais do JSON
    loadMaterials();

    console.log('✅ Setup p5.js completo');
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAW - Loop Principal
// ─────────────────────────────────────────────────────────────────────────────

function draw() {
    // Fundo preto
    background(0);

    // Camada 1: Renderizar vídeos (back primeiro, front por cima)
    if (isPlaying) {
        drawVideoElement(backVideo);   // atrás
        drawVideoElement(frontVideo);  // na frente
        checkPreload();
        checkAudioCrossfade();
        updateImageLayer();
    }

    // Placeholder: mostrar status quando pausado
    if (!isPlaying) {
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(14);
        text('Clique em PLAY para começar', width / 2, height / 2 + 100);
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
            const query = new URLSearchParams({
                'tipo': 'in.(sonhos,prospeccoes)',
                'video_url': 'not.is.null',
                'audio_10s_url': 'not.is.null',
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
    nextAlreadyQueued = false;
    playButton.classList.add('hidden');

    console.log('▶️ Iniciando playback...');

    // Camada 1: Vídeos
    loadVideoInto(frontVideo, getRandomMaterial());

    // Camada 2+3: Áudio 10s com crossfade + espectral
    startAudioLayer();

    // Camada 4: Imagens overlay
    startImageLayer();
}

function pausePlayback() {
    isPlaying = false;
    playButton.classList.remove('hidden');

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
    let container = document.getElementById('p5-container');
    let w = container.clientWidth;
    let h = container.clientHeight;

    resizeCanvas(w, h);
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
 * Carrega e toca um material em um elemento de vídeo específico
 * Aleatoriza velocidade (0.8-1.2x)
 */
function loadVideoInto(videoEl, material) {
    if (!material) return;

    const videoPath = getMediaPath(material.video_path);
    videoEl._speed = 0.8 + Math.random() * 0.4;

    const slot = videoEl === frontVideo ? 'FRONT' : 'BACK';
    console.log(`🎬 ${material.id} → ${slot} (${videoEl._speed.toFixed(2)}x)`);

    videoEl.src = videoPath;
    videoEl.load();

    videoEl.addEventListener('canplay', () => {
        console.log(`✅ Pronto: ${material.id} (${videoEl.videoWidth}x${videoEl.videoHeight})`);
    }, { once: true });

    videoEl.addEventListener('error', () => {
        const err = videoEl.error;
        console.error(`❌ Erro: ${err ? err.message : '?'} (code: ${err ? err.code : '?'})`);
        if (videoEl === frontVideo) {
            loadVideoInto(frontVideo, getRandomMaterial());
        }
    }, { once: true });

    videoEl.playbackRate = videoEl._speed;
    const p = videoEl.play();
    if (p) p.catch(e => console.error('❌ Play:', e.message));
}

/**
 * Verifica se o frontVideo está perto do fim e pré-carrega o próximo no backVideo
 * Tempo restante real = (duration - currentTime) / playbackRate
 */
function checkPreload() {
    if (!frontVideo || frontVideo.readyState < 2 || nextAlreadyQueued) return;

    const remaining = (frontVideo.duration - frontVideo.currentTime) / frontVideo._speed;

    if (remaining <= PRELOAD_AHEAD && remaining > 0) {
        nextAlreadyQueued = true;
        console.log(`⏭️ Pré-carregando próximo (${remaining.toFixed(2)}s restantes)`);
        loadVideoInto(backVideo, getRandomMaterial());

        frontVideo.addEventListener('ended', swapVideos, { once: true });
    }
}

/**
 * Troca front/back: o back (já tocando) vira front, o antigo front vira back
 */
function swapVideos() {
    console.log('🔄 Swap: back → front');

    const temp = frontVideo;
    frontVideo = backVideo;
    backVideo = temp;

    // Limpar o antigo front (agora back) para próximo uso
    backVideo.pause();
    backVideo.removeAttribute('src');
    backVideo.load();

    currentMaterial = null;
    nextAlreadyQueued = false;
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
