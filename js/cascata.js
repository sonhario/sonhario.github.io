// ═══════════════════════════════════════════════════════════════════════════════
// CASCATA.JS - Engine Audiovisual de Partitura Finita
// Sonhario v1.2
//
// Gera burst audiovisual de 4-7s com intensificacao progressiva e corte seco.
// 5 blocos: Data Loader, Score Generator, Preloader, Playback Engine, UI Controller
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://nxanctcrqdcbbuhlktzb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW5jdGNycWRjYmJ1aGxrdHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNTUxOTEsImV4cCI6MjA4NDkzMTE5MX0.TkeaWGSR0MM0_VLJaOMFchdbkkM_fRPM5Zr53g7R7zk';

const DURATIONS = [4, 4.5, 5, 5.5, 6, 6.5, 7];
const SCALE_MIN = 0.07;
const SCALE_MAX = 0.70;
const MARGIN = 0.07;
const PRELOAD_TIMEOUT = 15000;
const ACCEL_INTERVAL = 0.5; // seconds between playbackRate bumps
const ACCEL_STEP = 0.05;

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 1: DATA LOADER
// ─────────────────────────────────────────────────────────────────────────────

let allMaterials = [];
let dataLoaded = false;

async function loadData() {
    const query = new URLSearchParams({
        select: 'external_id,tipo,video_url,audio_10s_url,audio_espectral_url,imagem_url',
        order: 'uploaded_at.desc'
    });

    const response = await fetch(`${SUPABASE_URL}/rest/v1/materials?${query}`, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
    });

    if (!response.ok) throw new Error(`Supabase: ${response.status}`);
    const rows = await response.json();

    allMaterials = rows.map(r => ({
        id: r.external_id,
        tipo: r.tipo,
        video_url: r.video_url,
        audio_10s_url: r.audio_10s_url,
        audio_espectral_url: r.audio_espectral_url,
        imagem_url: r.imagem_url
    }));

    dataLoaded = true;
    console.log(`Cascata: ${allMaterials.length} materiais carregados`);
}

function pickRandom(predicate, n, exclude) {
    const pool = allMaterials.filter(m => predicate(m) && !exclude.has(m.id));
    const result = [];
    const used = new Set(exclude);
    for (let i = 0; i < n && pool.length > 0; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        const item = pool.splice(idx, 1)[0];
        used.add(item.id);
        result.push(item);
    }
    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 2: SCORE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

function generateScore() {
    const duration = DURATIONS[Math.floor(Math.random() * DURATIONS.length)];
    const used = new Set();
    const events = [];

    // Select materials
    const videos = pickRandom(m => m.video_url, 2, used);
    videos.forEach(v => used.add(v.id));

    const audios10s = pickRandom(m => m.audio_10s_url, 3, used);
    audios10s.forEach(a => used.add(a.id));

    const spectrals = pickRandom(m => m.audio_espectral_url, 1, used);
    spectrals.forEach(s => used.add(s.id));

    const images = pickRandom(m => m.imagem_url, 2, used);
    images.forEach(img => used.add(img.id));

    // Video overlay (can reuse pool - pick from materials with video that weren't used as base)
    const overlayVideos = pickRandom(m => m.video_url && !used.has(m.id), 1, used);
    overlayVideos.forEach(v => used.add(v.id));

    // Calculate overlay positions for images and video overlay
    function calcOverlay() {
        const canvasMax = Math.max(window.innerWidth, window.innerHeight);
        const targetSize = canvasMax * (SCALE_MIN + Math.random() * (SCALE_MAX - SCALE_MIN));
        const scale = targetSize / canvasMax; // normalized
        const mx = window.innerWidth * MARGIN;
        const my = window.innerHeight * MARGIN;
        return { scale: targetSize, mx, my, targetSize };
    }

    // Phase 1: 0-25% — base video + 1 audio 10s
    if (videos[0]) {
        events.push({
            type: 'video_base',
            enterAt: 0,
            url: videos[0].video_url,
            id: videos[0].id
        });
    }
    if (audios10s[0]) {
        events.push({
            type: 'audio_10s',
            enterAt: 0,
            url: audios10s[0].audio_10s_url,
            gain: 1.0,
            id: audios10s[0].id
        });
    }

    // Phase 2: 25-45% — +1 image + 1 audio 10s
    const phase2Start = duration * 0.25;
    if (images[0]) {
        const ov = calcOverlay();
        events.push({
            type: 'image',
            enterAt: phase2Start,
            url: images[0].imagem_url,
            overlay: ov,
            id: images[0].id
        });
    }
    if (audios10s[1]) {
        events.push({
            type: 'audio_10s',
            enterAt: phase2Start,
            url: audios10s[1].audio_10s_url,
            gain: 1.0,
            id: audios10s[1].id
        });
    }

    // Phase 3: 45-60% — +spectral voice + 1 image
    const phase3Start = duration * 0.45;
    if (spectrals[0]) {
        events.push({
            type: 'audio_spectral',
            enterAt: phase3Start,
            url: spectrals[0].audio_espectral_url,
            gain: 1.5,
            id: spectrals[0].id
        });
    }
    if (images[1]) {
        const ov = calcOverlay();
        events.push({
            type: 'image',
            enterAt: phase3Start,
            url: images[1].imagem_url,
            overlay: ov,
            id: images[1].id
        });
    }

    // Phase 4: 60-75% — +overlay video + 1 audio 10s
    const phase4Start = duration * 0.60;
    if (overlayVideos[0]) {
        const ov = calcOverlay();
        events.push({
            type: 'video_overlay',
            enterAt: phase4Start,
            url: overlayVideos[0].video_url,
            overlay: ov,
            id: overlayVideos[0].id
        });
    }
    if (audios10s[2]) {
        events.push({
            type: 'audio_10s',
            enterAt: phase4Start,
            url: audios10s[2].audio_10s_url,
            gain: 1.0,
            id: audios10s[2].id
        });
    }

    // Phase 5: 75-100% — acceleration (handled by engine, not event)
    const accelStart = duration * 0.75;

    console.log(`Cascata: partitura ${duration}s, ${events.length} eventos`);

    return { duration, events, accelStart };
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 3: PRELOADER
// ─────────────────────────────────────────────────────────────────────────────

function preloadScore(score, onProgress) {
    return new Promise((resolve) => {
        const elements = [];
        let loaded = 0;
        const total = score.events.length;

        function checkDone() {
            loaded++;
            if (onProgress) onProgress(loaded, total);
            if (loaded >= total) resolve(elements);
        }

        score.events.forEach((evt, i) => {
            let el = null;
            let timeoutId = null;

            const onReady = () => {
                if (timeoutId) clearTimeout(timeoutId);
                evt._element = el;
                elements.push(evt);
                checkDone();
            };

            const onTimeout = () => {
                console.warn(`Cascata: timeout preload ${evt.type} ${evt.id}`);
                evt._element = el; // may still work
                evt._skipped = true;
                elements.push(evt);
                checkDone();
            };

            timeoutId = setTimeout(onTimeout, PRELOAD_TIMEOUT);

            if (evt.type === 'video_base' || evt.type === 'video_overlay') {
                el = document.createElement('video');
                el.crossOrigin = 'anonymous';
                el.muted = true;
                el.playsInline = true;
                el.preload = 'auto';
                if (evt.type === 'video_base') el.loop = true;
                el.style.display = 'none';
                el.src = evt.url;
                document.body.appendChild(el);
                el.addEventListener('canplaythrough', onReady, { once: true });
                el.load();
            } else if (evt.type === 'audio_10s' || evt.type === 'audio_spectral') {
                el = document.createElement('audio');
                el.crossOrigin = 'anonymous';
                el.preload = 'auto';
                el.style.display = 'none';
                el.src = evt.url;
                document.body.appendChild(el);
                el.addEventListener('canplaythrough', onReady, { once: true });
                el.load();
            } else if (evt.type === 'image') {
                el = new Image();
                el.crossOrigin = 'anonymous';
                el.onload = onReady;
                el.onerror = onTimeout;
                el.src = evt.url;
            }

            evt._element = el;
        });

        if (total === 0) resolve(elements);
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 4: PLAYBACK ENGINE
// ─────────────────────────────────────────────────────────────────────────────

let audioCtx = null;
let scoreData = null;
let playbackStart = 0;
let isPlaying = false;
let lastAccelTime = 0;
let currentPlaybackRate = 1.0;
let gainNodes = []; // track for cleanup

function startPlayback(score) {
    scoreData = score;
    isPlaying = true;
    currentPlaybackRate = 1.0;
    lastAccelTime = 0;
    gainNodes = [];

    // Create or resume AudioContext
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;

    // Setup audio events via Web Audio API
    score.events.forEach(evt => {
        if (evt.type === 'audio_10s' || evt.type === 'audio_spectral') {
            const el = evt._element;
            if (!el) return;

            try {
                // Create source only if not already connected
                if (!evt._source) {
                    const source = audioCtx.createMediaElementSource(el);
                    const gainNode = audioCtx.createGain();
                    gainNode.gain.setValueAtTime(0, now);
                    // Schedule gain ramp at enterAt
                    gainNode.gain.setValueAtTime(0, now + evt.enterAt);
                    gainNode.gain.linearRampToValueAtTime(
                        evt.gain,
                        now + evt.enterAt + 0.1
                    );
                    source.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    evt._source = source;
                    evt._gainNode = gainNode;
                    gainNodes.push(gainNode);
                }
            } catch (e) {
                console.warn(`Cascata: audio setup error ${evt.id}`, e.message);
            }

            // Start playing immediately at gain 0 (avoids buffering delay)
            el.currentTime = 0;
            const p = el.play();
            if (p) p.catch(() => {});
        }

        // Start all videos immediately (muted), draw loop ignores until enterAt
        if (evt.type === 'video_base' || evt.type === 'video_overlay') {
            const el = evt._element;
            if (!el) return;
            el.currentTime = 0;
            const p = el.play();
            if (p) p.catch(() => {});
        }
    });

    playbackStart = performance.now();
    console.log(`Cascata: playback iniciado (${score.duration}s)`);
}

function updatePlayback() {
    if (!isPlaying || !scoreData) return;

    const elapsed = (performance.now() - playbackStart) / 1000;

    // Hard cut at end
    if (elapsed >= scoreData.duration) {
        hardCut();
        return;
    }

    // Draw layers
    const ctx = drawingContext;
    background(0);

    scoreData.events.forEach(evt => {
        if (elapsed < evt.enterAt) return;
        if (!evt._element) return;

        if (evt.type === 'video_base') {
            drawVideoFit(ctx, evt._element);
        } else if (evt.type === 'video_overlay') {
            drawOverlay(ctx, evt._element, evt.overlay);
        } else if (evt.type === 'image') {
            drawOverlay(ctx, evt._element, evt.overlay);
        }
    });

    // Phase 5: Acceleration
    if (elapsed >= scoreData.accelStart) {
        const accelElapsed = elapsed - scoreData.accelStart;
        const accelSteps = Math.floor(accelElapsed / ACCEL_INTERVAL);
        const targetRate = 1.0 + accelSteps * ACCEL_STEP;

        if (targetRate !== currentPlaybackRate) {
            currentPlaybackRate = targetRate;
            scoreData.events.forEach(evt => {
                if (!evt._element) return;
                if (evt.type === 'video_base' || evt.type === 'video_overlay') {
                    try { evt._element.playbackRate = currentPlaybackRate; } catch (e) {}
                }
                if (evt.type === 'audio_10s' || evt.type === 'audio_spectral') {
                    try { evt._element.playbackRate = currentPlaybackRate; } catch (e) {}
                }
            });
        }
    }
}

function drawVideoFit(ctx, videoEl) {
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

    ctx.drawImage(videoEl, ox, oy, dw, dh);
}

function drawOverlay(ctx, el, overlay) {
    if (!el) return;

    // For video overlays, check readyState
    if (el.tagName === 'VIDEO' && el.readyState < 2) return;

    const isVideo = el.tagName === 'VIDEO';
    const natW = isVideo ? el.videoWidth : el.naturalWidth;
    const natH = isVideo ? el.videoHeight : el.naturalHeight;
    if (!natW || !natH) return;

    const canvasMax = Math.max(width, height);
    const targetSize = overlay.targetSize;
    const imgMax = Math.max(natW, natH);
    const scale = targetSize / imgMax;

    const drawW = natW * scale;
    const drawH = natH * scale;

    const mx = width * MARGIN;
    const my = height * MARGIN;
    const minX = mx;
    const maxX = width - mx - drawW;
    const minY = my;
    const maxY = height - my - drawH;

    // Use seeded position from overlay (recalculate once, store)
    if (overlay._x === undefined) {
        overlay._x = minX + Math.random() * Math.max(0, maxX - minX);
        overlay._y = minY + Math.random() * Math.max(0, maxY - minY);
    }

    ctx.drawImage(el, overlay._x, overlay._y, drawW, drawH);
}

function hardCut() {
    isPlaying = false;
    console.log('Cascata: CORTE SECO');

    // Stop all audio immediately
    if (audioCtx) {
        const now = audioCtx.currentTime;
        gainNodes.forEach(g => {
            try {
                g.gain.cancelScheduledValues(now);
                g.gain.setValueAtTime(0, now);
            } catch (e) {}
        });
    }

    // Pause and cleanup all elements
    if (scoreData) {
        scoreData.events.forEach(evt => {
            if (evt._element) {
                try {
                    if (evt._element.pause) evt._element.pause();
                } catch (e) {}
            }
        });
    }

    // Clear canvas
    background(0);

    // Show button again
    showButton();
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 5: UI CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────

let cascataButton;
let progressBar;
let progressFill;
let progressText;

function initUI() {
    cascataButton = document.getElementById('cascata-button');
    progressBar = document.getElementById('progress-bar');
    progressFill = document.getElementById('progress-fill');
    progressText = document.getElementById('progress-text');

    cascataButton.addEventListener('click', startCascata);
}

function showButton() {
    cascataButton.classList.remove('hidden');
    progressBar.classList.add('hidden');
}

function hideButton() {
    cascataButton.classList.add('hidden');
}

function showProgress() {
    progressBar.classList.remove('hidden');
    progressFill.style.width = '0%';
    progressText.textContent = '0/0';
}

function hideProgress() {
    progressBar.classList.add('hidden');
}

function updateProgress(loaded, total) {
    const pct = total > 0 ? (loaded / total * 100) : 0;
    progressFill.style.width = pct + '%';
    progressText.textContent = `${loaded}/${total}`;
}

function cleanup() {
    // Remove previously created DOM elements to avoid createMediaElementSource conflicts
    if (scoreData) {
        scoreData.events.forEach(evt => {
            if (evt._element && evt._element.parentNode) {
                try {
                    if (evt._element.pause) evt._element.pause();
                    evt._element.removeAttribute('src');
                } catch (e) {}
                evt._element.parentNode.removeChild(evt._element);
            }
            evt._element = null;
            evt._source = null;
            evt._gainNode = null;
        });
    }
    scoreData = null;
    gainNodes = [];

    // Close and recreate AudioContext to avoid MediaElementSource reuse issues
    if (audioCtx) {
        try { audioCtx.close(); } catch (e) {}
        audioCtx = null;
    }
}

async function startCascata() {
    if (!dataLoaded) {
        console.warn('Cascata: dados ainda carregando');
        return;
    }

    hideButton();
    cleanup();

    const score = generateScore();

    showProgress();
    await preloadScore(score, (loaded, total) => {
        updateProgress(loaded, total);
    });

    hideProgress();
    startPlayback(score);
}

// ─────────────────────────────────────────────────────────────────────────────
// P5.JS HOOKS
// ─────────────────────────────────────────────────────────────────────────────

function setup() {
    const container = document.getElementById('p5-container');
    createCanvas(container.clientWidth, container.clientHeight);
    background(0);

    initUI();
    loadData();
}

function draw() {
    if (isPlaying) {
        updatePlayback();
    }
}

function windowResized() {
    const container = document.getElementById('p5-container');
    resizeCanvas(container.clientWidth, container.clientHeight);
}
