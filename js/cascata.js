// ═══════════════════════════════════════════════════════════════════════════════
// CASCATA.JS - Engine Audiovisual de Partitura Finita
// Sonhario v1.3
//
// Gera burst audiovisual de 4-7s com intensificacao progressiva e corte seco.
// Canais de overlay pulsantes: ciclam por multiplos assets com tempos decrescentes.
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
const ACCEL_INTERVAL = 0.5;
const ACCEL_STEP = 0.05;

// Channel timing
const CH_FIRST_SHOW = 1.0;      // first asset shows for 1s
const CH_SHOW = 0.5;            // subsequent assets show for 0.5s
const CH_GAP_MIN = 0.2;         // initial gap range min
const CH_GAP_MAX = 0.5;         // initial gap range max
const CH_GAP_DECAY = 0.75;      // gap multiplier each cycle
const CH_GAP_FLOOR = 0.05;      // minimum gap

// Preload limits (only load what will actually be used)
const MAX_IMAGES_PER_CHANNEL = 6;   // ~6 images max in 4-7s with pulsing
const MAX_VIDEOS_PER_CHANNEL = 2;   // video channel enters late, 2 is enough

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

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 2: SCORE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

function generateScore() {
    const duration = DURATIONS[Math.floor(Math.random() * DURATIONS.length)];
    const used = new Set();
    const events = [];

    // Select base video + audios (same as before)
    const videos = pickRandom(m => m.video_url, 1, used);
    videos.forEach(v => used.add(v.id));

    const audios10s = pickRandom(m => m.audio_10s_url, 3, used);
    audios10s.forEach(a => used.add(a.id));

    const spectrals = pickRandom(m => m.audio_espectral_url, 1, used);
    spectrals.forEach(s => used.add(s.id));

    // Collect pools for channels (all available, excluding base video/audios)
    const imagePool = allMaterials
        .filter(m => m.imagem_url && !used.has(m.id))
        .map(m => m.imagem_url);
    const videoPool = allMaterials
        .filter(m => m.video_url && !used.has(m.id))
        .map(m => m.video_url);

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

    // Phase 2: 25-45% — image channel + 1 audio 10s
    const phase2Start = duration * 0.25;
    if (imagePool.length > 0) {
        // Select only what we'll use, not the entire pool
        const selectedImages1 = shuffleArray([...imagePool]).slice(0, MAX_IMAGES_PER_CHANNEL);
        events.push({
            type: 'image_channel',
            enterAt: phase2Start,
            pool: selectedImages1
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

    // Phase 3: 45-60% — spectral voice + image channel
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
    if (imagePool.length > 0) {
        // Select different images for second channel
        const selectedImages2 = shuffleArray([...imagePool]).slice(0, MAX_IMAGES_PER_CHANNEL);
        events.push({
            type: 'image_channel',
            enterAt: phase3Start,
            pool: selectedImages2
        });
    }

    // Phase 4: 60-75% — video channel + 1 audio 10s
    const phase4Start = duration * 0.60;
    if (videoPool.length > 0) {
        // Select only what we'll use (video channel is brief)
        const selectedVideos = shuffleArray([...videoPool]).slice(0, MAX_VIDEOS_PER_CHANNEL);
        events.push({
            type: 'video_channel',
            enterAt: phase4Start,
            pool: selectedVideos
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

    const accelStart = duration * 0.75;

    console.log(`Cascata: partitura ${duration}s, ${events.length} eventos, img pool ${imagePool.length}, vid pool ${videoPool.length}`);

    return { duration, events, accelStart };
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 3: PRELOADER
// ─────────────────────────────────────────────────────────────────────────────

function preloadScore(score, onProgress) {
    return new Promise((resolve) => {
        // Count total items to preload
        let totalItems = 0;
        let loadedItems = 0;

        // Collect unique URLs across all channels + single events
        const imageUrls = new Set();
        const videoUrls = new Set();

        score.events.forEach(evt => {
            if (evt.type === 'video_base') {
                videoUrls.add(evt.url);
            } else if (evt.type === 'audio_10s' || evt.type === 'audio_spectral') {
                totalItems++;
            } else if (evt.type === 'image_channel') {
                // Pool already limited in generateScore()
                evt.pool.forEach(u => imageUrls.add(u));
            } else if (evt.type === 'video_channel') {
                // Pool already limited in generateScore()
                evt.pool.forEach(u => videoUrls.add(u));
            }
        });

        totalItems += imageUrls.size + videoUrls.size;

        // Shared preloaded asset caches
        const preloadedImages = {};  // url -> Image
        const preloadedVideos = {};  // url -> HTMLVideoElement

        function itemDone() {
            loadedItems++;
            if (onProgress) onProgress(loadedItems, totalItems);
            if (loadedItems >= totalItems) finalize();
        }

        function finalize() {
            // Attach preloaded assets to events
            score.events.forEach(evt => {
                if (evt.type === 'image_channel') {
                    evt._images = evt.pool
                        .filter(u => preloadedImages[u])
                        .map(u => preloadedImages[u]);
                } else if (evt.type === 'video_channel') {
                    // Pool already limited in generateScore()
                    evt._videos = evt.pool
                        .filter(u => preloadedVideos[u])
                        .map(u => preloadedVideos[u]);
                }
            });
            resolve();
        }

        // Preload images
        imageUrls.forEach(url => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            const timeout = setTimeout(() => {
                preloadedImages[url] = img; // may partially work
                itemDone();
            }, PRELOAD_TIMEOUT);
            img.onload = () => {
                clearTimeout(timeout);
                preloadedImages[url] = img;
                itemDone();
            };
            img.onerror = () => {
                clearTimeout(timeout);
                itemDone();
            };
            img.src = url;
        });

        // Preload videos (base + channel)
        videoUrls.forEach(url => {
            const vid = document.createElement('video');
            vid.crossOrigin = 'anonymous';
            vid.muted = true;
            vid.playsInline = true;
            vid.preload = 'auto';
            vid.style.display = 'none';
            vid.src = url;
            document.body.appendChild(vid);

            const timeout = setTimeout(() => {
                preloadedVideos[url] = vid;
                itemDone();
            }, PRELOAD_TIMEOUT);

            vid.addEventListener('canplaythrough', () => {
                clearTimeout(timeout);
                preloadedVideos[url] = vid;
                itemDone();
            }, { once: true });

            vid.load();
        });

        // Attach base video element directly
        score.events.forEach(evt => {
            if (evt.type === 'video_base') {
                // Will be set by the video preload above
                Object.defineProperty(evt, '_element', {
                    get: () => preloadedVideos[evt.url],
                    configurable: true
                });
            }
        });

        // Preload audio elements
        score.events.forEach(evt => {
            if (evt.type === 'audio_10s' || evt.type === 'audio_spectral') {
                const el = document.createElement('audio');
                el.crossOrigin = 'anonymous';
                el.preload = 'auto';
                el.style.display = 'none';
                el.src = evt.url;
                document.body.appendChild(el);

                const timeout = setTimeout(() => {
                    evt._element = el;
                    itemDone();
                }, PRELOAD_TIMEOUT);

                el.addEventListener('canplaythrough', () => {
                    clearTimeout(timeout);
                    evt._element = el;
                    itemDone();
                }, { once: true });

                el.load();
            }
        });

        if (totalItems === 0) finalize();
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 4: PLAYBACK ENGINE
// ─────────────────────────────────────────────────────────────────────────────

let audioCtx = null;
let scoreData = null;
let playbackStart = 0;
let isPlaying = false;
let currentPlaybackRate = 1.0;
let gainNodes = [];

function calcOverlayPos(natW, natH) {
    const canvasMax = Math.max(width, height);
    const targetSize = canvasMax * (SCALE_MIN + Math.random() * (SCALE_MAX - SCALE_MIN));
    const imgMax = Math.max(natW, natH);
    const scale = targetSize / imgMax;
    const drawW = natW * scale;
    const drawH = natH * scale;
    const mx = width * MARGIN;
    const my = height * MARGIN;
    const x = mx + Math.random() * Math.max(0, width - 2 * mx - drawW);
    const y = my + Math.random() * Math.max(0, height - 2 * my - drawH);
    return { x, y, w: drawW, h: drawH };
}

function initChannel(evt) {
    evt._phase = 'show';
    evt._cycleCount = 0;
    evt._showDuration = CH_FIRST_SHOW;
    evt._gapRange = CH_GAP_MIN + Math.random() * (CH_GAP_MAX - CH_GAP_MIN);
    evt._phaseStart = 0; // relative to channel enterAt
    evt._currentIdx = 0;
    evt._overlay = null;

    // Pick first asset and calculate position
    if (evt.type === 'image_channel' && evt._images && evt._images.length > 0) {
        evt._currentIdx = Math.floor(Math.random() * evt._images.length);
        const img = evt._images[evt._currentIdx];
        evt._overlay = calcOverlayPos(img.naturalWidth, img.naturalHeight);
    } else if (evt.type === 'video_channel' && evt._videos && evt._videos.length > 0) {
        evt._currentIdx = Math.floor(Math.random() * evt._videos.length);
        const vid = evt._videos[evt._currentIdx];
        // Start all channel videos playing
        evt._videos.forEach(v => {
            v.loop = true;
            const p = v.play();
            if (p) p.catch(() => {});
        });
        if (vid.videoWidth && vid.videoHeight) {
            evt._overlay = calcOverlayPos(vid.videoWidth, vid.videoHeight);
        }
    }
}

function advanceChannel(evt) {
    evt._cycleCount++;
    evt._showDuration = CH_SHOW;
    evt._gapRange = Math.max(CH_GAP_FLOOR, evt._gapRange * CH_GAP_DECAY);

    // Pick new random asset
    if (evt.type === 'image_channel' && evt._images && evt._images.length > 0) {
        evt._currentIdx = Math.floor(Math.random() * evt._images.length);
        const img = evt._images[evt._currentIdx];
        evt._overlay = calcOverlayPos(img.naturalWidth, img.naturalHeight);
    } else if (evt.type === 'video_channel' && evt._videos && evt._videos.length > 0) {
        evt._currentIdx = Math.floor(Math.random() * evt._videos.length);
        const vid = evt._videos[evt._currentIdx];
        if (vid.videoWidth && vid.videoHeight) {
            evt._overlay = calcOverlayPos(vid.videoWidth, vid.videoHeight);
        }
    }
}

function updateChannel(evt, channelElapsed) {
    if (!evt._overlay) return;

    const sincePhaseStart = channelElapsed - evt._phaseStart;

    if (evt._phase === 'show') {
        if (sincePhaseStart >= evt._showDuration) {
            // Transition to gap
            evt._phase = 'gap';
            evt._phaseStart = channelElapsed;
            evt._currentGap = evt._gapRange * (0.8 + Math.random() * 0.4); // slight variation
        }
    } else if (evt._phase === 'gap') {
        if (sincePhaseStart >= evt._currentGap) {
            // Advance to next asset
            advanceChannel(evt);
            evt._phase = 'show';
            evt._phaseStart = channelElapsed;
        }
    }
}

function drawChannel(ctx, evt) {
    if (evt._phase !== 'show' || !evt._overlay) return;

    if (evt.type === 'image_channel') {
        if (!evt._images || evt._images.length === 0) return;
        const img = evt._images[evt._currentIdx];
        if (!img) return;
        const ov = evt._overlay;
        ctx.drawImage(img, ov.x, ov.y, ov.w, ov.h);
    } else if (evt.type === 'video_channel') {
        if (!evt._videos || evt._videos.length === 0) return;
        const vid = evt._videos[evt._currentIdx];
        if (!vid || vid.readyState < 2) return;
        const ov = evt._overlay;
        ctx.drawImage(vid, ov.x, ov.y, ov.w, ov.h);
    }
}

function startPlayback(score) {
    scoreData = score;
    isPlaying = true;
    currentPlaybackRate = 1.0;
    gainNodes = [];

    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;

    // Setup audio events
    score.events.forEach(evt => {
        if (evt.type === 'audio_10s' || evt.type === 'audio_spectral') {
            const el = evt._element;
            if (!el) return;
            try {
                if (!evt._source) {
                    const source = audioCtx.createMediaElementSource(el);
                    const gainNode = audioCtx.createGain();
                    gainNode.gain.setValueAtTime(0, now);
                    gainNode.gain.setValueAtTime(0, now + evt.enterAt);
                    gainNode.gain.linearRampToValueAtTime(evt.gain, now + evt.enterAt + 0.1);
                    source.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    evt._source = source;
                    evt._gainNode = gainNode;
                    gainNodes.push(gainNode);
                }
            } catch (e) {
                console.warn(`Cascata: audio setup error`, e.message);
            }
            el.currentTime = 0;
            const p = el.play();
            if (p) p.catch(() => {});
        }

        // Start base video immediately
        if (evt.type === 'video_base') {
            const el = evt._element;
            if (!el) return;
            el.loop = true;
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

    if (elapsed >= scoreData.duration) {
        hardCut();
        return;
    }

    const ctx = drawingContext;
    background(0);

    scoreData.events.forEach(evt => {
        if (elapsed < evt.enterAt) return;

        if (evt.type === 'video_base') {
            if (evt._element) drawVideoFit(ctx, evt._element);
        } else if (evt.type === 'image_channel' || evt.type === 'video_channel') {
            const channelElapsed = elapsed - evt.enterAt;
            // Initialize channel on first frame
            if (evt._phase === undefined) initChannel(evt);
            updateChannel(evt, channelElapsed);
            drawChannel(ctx, evt);
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
                if (evt.type === 'video_base' && evt._element) {
                    try { evt._element.playbackRate = currentPlaybackRate; } catch (e) {}
                }
                if (evt.type === 'video_channel' && evt._videos) {
                    evt._videos.forEach(v => {
                        try { v.playbackRate = currentPlaybackRate; } catch (e) {}
                    });
                }
                if ((evt.type === 'audio_10s' || evt.type === 'audio_spectral') && evt._element) {
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

function hardCut() {
    isPlaying = false;
    console.log('Cascata: CORTE SECO');

    if (audioCtx) {
        const now = audioCtx.currentTime;
        gainNodes.forEach(g => {
            try {
                g.gain.cancelScheduledValues(now);
                g.gain.setValueAtTime(0, now);
            } catch (e) {}
        });
    }

    if (scoreData) {
        scoreData.events.forEach(evt => {
            if (evt._element) {
                try { if (evt._element.pause) evt._element.pause(); } catch (e) {}
            }
            if (evt._videos) {
                evt._videos.forEach(v => {
                    try { v.pause(); } catch (e) {}
                });
            }
        });
    }

    background(0);
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
    if (scoreData) {
        scoreData.events.forEach(evt => {
            // Clean audio elements
            if (evt._element && evt._element.parentNode) {
                try {
                    if (evt._element.pause) evt._element.pause();
                    evt._element.removeAttribute('src');
                } catch (e) {}
                evt._element.parentNode.removeChild(evt._element);
            }
            // Clean video channel elements
            if (evt._videos) {
                evt._videos.forEach(v => {
                    try { v.pause(); v.removeAttribute('src'); } catch (e) {}
                    if (v.parentNode) v.parentNode.removeChild(v);
                });
            }
            evt._element = null;
            evt._source = null;
            evt._gainNode = null;
            evt._images = null;
            evt._videos = null;
            evt._phase = undefined;
            evt._overlay = null;
        });
    }

    // Also clean any leftover hidden video/audio elements from preloading
    document.querySelectorAll('video[style*="display: none"], audio[style*="display: none"]').forEach(el => {
        try { el.pause(); el.removeAttribute('src'); } catch (e) {}
        if (el.parentNode) el.parentNode.removeChild(el);
    });

    scoreData = null;
    gainNodes = [];

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
