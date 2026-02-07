// ═══════════════════════════════════════════════════════════════════════════════
// CASCATA V2 - Engine Audiovisual de Partitura Finita
// Sonhario v2.2
//
// 4 image channels + 3 video channels sobre fundo pulsante.
// 3 audio ambient channels + 1 spectral channel (pools encadeados).
// Pools compartilhados. Frequencia visual progressiva.
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://nxanctcrqdcbbuhlktzb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW5jdGNycWRjYmJ1aGxrdHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNTUxOTEsImV4cCI6MjA4NDkzMTE5MX0.TkeaWGSR0MM0_VLJaOMFchdbkkM_fRPM5Zr53g7R7zk';

// Duration range (seconds)
const DURATIONS = [20, 22, 24, 25, 26];

// Responsive grid: solid bg + dark cells only
const GRID_DENSITY = 45;              // target cells on minor axis
const GRID_BG = [232, 234, 240];      // canvas background (near-white, slight blue tint)
const GRID_CELL_COLOR = [26, 29, 46]; // cell color (same as page bg #1a1d2e)

// Pulse timing (seconds per phase)
const PULSE_LOADING = 1.5;
const PULSE_CASCATA = 0.7;

// Overlay sizing
const SCALE_MIN = 0.10;
const SCALE_MAX = 0.65;
const MARGIN = 0.05;

// Image crop range (show 50-100% of each dimension)
const CROP_MIN = 0.5;
const CROP_MAX = 1.0;

// Visual channel timing (base values — divided by speed multiplier)
const CH_FIRST_SHOW = 4.5;
const CH_SHOW = 2.5;
const CH_GAP_MIN = 1.0;
const CH_GAP_MAX = 2.5;

// Speed curve: quartic (slow ramp, late acceleration)
// t=0: 1x, t=0.5: 2.1x, t=0.75: 6.7x, t=1: 19x
const SPEED_EXPONENT = 4;
const SPEED_MAX_MULT = 18;

// Video channels: cap cycle speed
const VIDEO_SPEED_CAP = 6.0;

// Video acceleration in last phase
const ACCEL_PHASE = 0.74;
const ACCEL_INTERVAL = 0.5;
const ACCEL_STEP = 0.05;

// Shared pool sizes
const SHARED_IMAGES = 10;
const SHARED_VIDEOS = 4;

// Audio pools: each channel gets N audio files that chain until hard cut
const AUDIO_PER_AMBIENT = 2;    // files per ambient channel
const AUDIO_PER_SPECTRAL = 2;   // files per spectral channel
const NUM_AMBIENT_CHANNELS = 5;
const NUM_SPECTRAL_CHANNELS = 3;

const PRELOAD_TIMEOUT = 15000;

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
    console.log(`Cascata v2: ${allMaterials.length} materiais carregados`);
}

function pickRandomUrls(predicate, urlKey, n) {
    const pool = allMaterials.filter(predicate).map(m => m[urlKey]);
    return shuffleArray(pool).slice(0, n);
}

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 2: SPEED CURVE
// ─────────────────────────────────────────────────────────────────────────────

function getSpeedMultiplier(elapsed, duration) {
    const t = Math.min(elapsed / duration, 1);
    return 1 + Math.pow(t, SPEED_EXPONENT) * SPEED_MAX_MULT;
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 3: SCORE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

function generateScore() {
    const duration = DURATIONS[Math.floor(Math.random() * DURATIONS.length)];
    const events = [];

    // Shared visual pools
    const allImageUrls = pickRandomUrls(m => m.imagem_url, 'imagem_url', SHARED_IMAGES);
    const allVideoUrls = pickRandomUrls(m => m.video_url, 'video_url', SHARED_VIDEOS);

    // Audio pools
    const totalAmbient = NUM_AMBIENT_CHANNELS * AUDIO_PER_AMBIENT;
    const ambientUrls = pickRandomUrls(m => m.audio_10s_url, 'audio_10s_url', totalAmbient);
    const totalSpectral = NUM_SPECTRAL_CHANNELS * AUDIO_PER_SPECTRAL;
    const spectralUrls = pickRandomUrls(m => m.audio_espectral_url, 'audio_espectral_url', totalSpectral);

    console.log(`Cascata v2: ${ambientUrls.length} ambient urls, ${spectralUrls.length} spectral urls`);

    // 7 visual channels staggered
    const visualSchedule = [
        { type: 'image_channel', pct: 0.00 },
        { type: 'video_channel', pct: 0.10 },
        { type: 'image_channel', pct: 0.20 },
        { type: 'video_channel', pct: 0.33 },
        { type: 'image_channel', pct: 0.46 },
        { type: 'video_channel', pct: 0.58 },
        { type: 'image_channel', pct: 0.70 },
    ];

    visualSchedule.forEach(ch => {
        const enterAt = duration * ch.pct;
        if (ch.type === 'image_channel' && allImageUrls.length > 0) {
            events.push({ type: 'image_channel', enterAt });
        } else if (ch.type === 'video_channel' && allVideoUrls.length > 0) {
            events.push({ type: 'video_channel', enterAt });
        }
    });

    // 5 ambient audio channels (staggered, more overlap = fewer gaps)
    const ambientEntries = [1 / duration, 0.12, 0.25, 0.40, 0.58];
    ambientEntries.forEach((pct, i) => {
        const start = i * AUDIO_PER_AMBIENT;
        const pool = ambientUrls.slice(start, start + AUDIO_PER_AMBIENT);
        if (pool.length > 0) {
            events.push({
                type: 'audio_channel',
                subtype: 'ambient',
                enterAt: duration * pct,
                audioUrls: pool,
                gain: 1.0
            });
        }
    });

    // 3 spectral audio channels (each with own pool, all fade out at end)
    const spectralEntries = [5, 12, 18]; // fixed seconds
    spectralEntries.forEach((enterAt, i) => {
        const start = i * AUDIO_PER_SPECTRAL;
        const pool = spectralUrls.slice(start, start + AUDIO_PER_SPECTRAL);
        if (pool.length > 0) {
            events.push({
                type: 'audio_channel',
                subtype: 'spectral',
                enterAt,
                audioUrls: pool,
                gain: 1.5
            });
        }
    });

    const accelStart = duration * ACCEL_PHASE;

    console.log(`Cascata v2: partitura ${duration}s, ${events.length} eventos, ` +
        `${allImageUrls.length} imgs, ${allVideoUrls.length} vids, ` +
        `${ambientUrls.length} audio ambient (${NUM_AMBIENT_CHANNELS} ch), ` +
        `${spectralUrls.length} audio spectral (${NUM_SPECTRAL_CHANNELS} ch)`);

    return { duration, events, accelStart, sharedImageUrls: allImageUrls, sharedVideoUrls: allVideoUrls };
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 4: PRELOADER
// ─────────────────────────────────────────────────────────────────────────────

let sharedPreloadedImages = [];
let sharedPreloadedVideos = [];

function preloadScore(score, onProgress) {
    return new Promise((resolve) => {
        let totalItems = 0;
        let loadedItems = 0;
        let finalized = false;

        // Count all items to preload
        totalItems += score.sharedImageUrls.length;
        totalItems += score.sharedVideoUrls.length;
        score.events.forEach(evt => {
            if (evt.type === 'audio_channel') {
                totalItems += evt.audioUrls.length;
            }
        });

        const tempImages = {};
        const tempVideos = {};

        function itemDone() {
            if (finalized) return;
            loadedItems++;
            if (onProgress) onProgress(loadedItems, totalItems);
            if (loadedItems >= totalItems) finalize();
        }

        function finalize() {
            if (finalized) return;
            finalized = true;

            sharedPreloadedImages = score.sharedImageUrls
                .filter(u => tempImages[u]).map(u => tempImages[u]);
            sharedPreloadedVideos = score.sharedVideoUrls
                .filter(u => tempVideos[u]).map(u => tempVideos[u]);

            console.log(`Cascata v2: preload completo — ${sharedPreloadedImages.length} imgs, ` +
                `${sharedPreloadedVideos.length} vids`);
            resolve();
        }

        // Preload images
        score.sharedImageUrls.forEach(url => {
            let done = false;
            const img = new Image();
            img.crossOrigin = 'anonymous';
            const timeout = setTimeout(() => {
                if (done) return; done = true;
                itemDone();
            }, PRELOAD_TIMEOUT);
            img.onload = () => {
                if (done) return; done = true;
                clearTimeout(timeout);
                tempImages[url] = img;
                itemDone();
            };
            img.onerror = () => {
                if (done) return; done = true;
                clearTimeout(timeout);
                itemDone();
            };
            img.src = url;
        });

        // Preload videos
        score.sharedVideoUrls.forEach(url => {
            let done = false;
            const vid = document.createElement('video');
            vid.crossOrigin = 'anonymous';
            vid.muted = true;
            vid.playsInline = true;
            vid.preload = 'auto';
            vid.loop = true;
            vid.style.display = 'none';
            vid.src = url;
            document.body.appendChild(vid);

            const timeout = setTimeout(() => {
                if (done) return; done = true;
                tempVideos[url] = vid;
                itemDone();
            }, PRELOAD_TIMEOUT);

            vid.addEventListener('canplaythrough', () => {
                if (done) return; done = true;
                clearTimeout(timeout);
                tempVideos[url] = vid;
                itemDone();
            }, { once: true });

            vid.load();
        });

        // Preload audio channel elements
        score.events.forEach(evt => {
            if (evt.type !== 'audio_channel') return;

            evt._audioElements = [];

            evt.audioUrls.forEach((url, idx) => {
                let done = false;
                const el = document.createElement('audio');
                el.crossOrigin = 'anonymous';
                el.preload = 'auto';
                el.style.display = 'none';
                el.src = url;
                document.body.appendChild(el);

                const timeout = setTimeout(() => {
                    if (done) return; done = true;
                    evt._audioElements[idx] = el;
                    itemDone();
                }, PRELOAD_TIMEOUT);

                el.addEventListener('canplaythrough', () => {
                    if (done) return; done = true;
                    clearTimeout(timeout);
                    evt._audioElements[idx] = el;
                    itemDone();
                }, { once: true });

                el.addEventListener('error', () => {
                    if (done) return; done = true;
                    clearTimeout(timeout);
                    console.error(`Cascata v2: audio ERRO ${evt.subtype}[${idx}]`);
                    evt._audioElements[idx] = null;
                    itemDone();
                }, { once: true });

                el.load();
            });
        });

        if (totalItems === 0) finalize();
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 5: OVERLAY POSITIONING
// ─────────────────────────────────────────────────────────────────────────────

function calcImageOverlay(natW, natH) {
    const cropFracW = CROP_MIN + Math.random() * (CROP_MAX - CROP_MIN);
    const cropFracH = CROP_MIN + Math.random() * (CROP_MAX - CROP_MIN);
    const srcW = Math.floor(natW * cropFracW);
    const srcH = Math.floor(natH * cropFracH);
    const srcX = Math.floor(Math.random() * (natW - srcW));
    const srcY = Math.floor(Math.random() * (natH - srcH));

    const canvasMax = Math.max(width, height);
    const targetSize = canvasMax * (SCALE_MIN + Math.random() * (SCALE_MAX - SCALE_MIN));
    const cropMax = Math.max(srcW, srcH);
    const scale = targetSize / cropMax;
    const drawW = srcW * scale;
    const drawH = srcH * scale;

    const mx = width * MARGIN;
    const my = height * MARGIN;
    const x = mx + Math.random() * Math.max(0, width - 2 * mx - drawW);
    const y = my + Math.random() * Math.max(0, height - 2 * my - drawH);

    return { srcX, srcY, srcW, srcH, x, y, w: drawW, h: drawH };
}

function calcVideoOverlay(vidW, vidH) {
    const canvasMax = Math.max(width, height);
    const targetSize = canvasMax * (SCALE_MIN + Math.random() * (SCALE_MAX - SCALE_MIN));
    const vidMax = Math.max(vidW, vidH);
    const scale = targetSize / vidMax;
    const drawW = vidW * scale;
    const drawH = vidH * scale;

    const mx = width * MARGIN;
    const my = height * MARGIN;
    const x = mx + Math.random() * Math.max(0, width - 2 * mx - drawW);
    const y = my + Math.random() * Math.max(0, height - 2 * my - drawH);

    return { x, y, w: drawW, h: drawH };
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 6: VISUAL CHANNEL STATE MACHINE
// ─────────────────────────────────────────────────────────────────────────────

function initChannel(evt) {
    evt._phase = 'show';
    evt._cycleCount = 0;
    evt._phaseStart = 0;
    evt._currentIdx = 0;
    evt._overlay = null;

    if (evt.type === 'image_channel' && sharedPreloadedImages.length > 0) {
        evt._currentIdx = Math.floor(Math.random() * sharedPreloadedImages.length);
        const img = sharedPreloadedImages[evt._currentIdx];
        evt._overlay = calcImageOverlay(img.naturalWidth, img.naturalHeight);
    } else if (evt.type === 'video_channel' && sharedPreloadedVideos.length > 0) {
        evt._currentIdx = Math.floor(Math.random() * sharedPreloadedVideos.length);
        const vid = sharedPreloadedVideos[evt._currentIdx];
        vid.currentTime = Math.random() * (vid.duration || 1);
        const p = vid.play();
        if (p) p.catch(() => {});
        if (vid.videoWidth && vid.videoHeight) {
            evt._overlay = calcVideoOverlay(vid.videoWidth, vid.videoHeight);
        }
    }
}

function advanceChannel(evt) {
    evt._cycleCount++;

    if (evt.type === 'image_channel' && sharedPreloadedImages.length > 0) {
        evt._currentIdx = Math.floor(Math.random() * sharedPreloadedImages.length);
        const img = sharedPreloadedImages[evt._currentIdx];
        evt._overlay = calcImageOverlay(img.naturalWidth, img.naturalHeight);
    } else if (evt.type === 'video_channel' && sharedPreloadedVideos.length > 0) {
        evt._currentIdx = Math.floor(Math.random() * sharedPreloadedVideos.length);
        const vid = sharedPreloadedVideos[evt._currentIdx];
        if (vid.paused) {
            vid.currentTime = Math.random() * (vid.duration || 1);
            const p = vid.play();
            if (p) p.catch(() => {});
        }
        if (vid.videoWidth && vid.videoHeight) {
            evt._overlay = calcVideoOverlay(vid.videoWidth, vid.videoHeight);
        }
    }
}

function updateChannel(evt, channelElapsed, speedMult) {
    if (!evt._overlay) return;

    const effectiveSpeed = evt.type === 'video_channel'
        ? Math.min(speedMult, VIDEO_SPEED_CAP)
        : speedMult;

    const sincePhaseStart = channelElapsed - evt._phaseStart;
    const showDur = (evt._cycleCount === 0 ? CH_FIRST_SHOW : CH_SHOW) / effectiveSpeed;

    if (evt._phase === 'show') {
        if (sincePhaseStart >= showDur) {
            evt._phase = 'gap';
            evt._phaseStart = channelElapsed;
            const baseGap = CH_GAP_MIN + Math.random() * (CH_GAP_MAX - CH_GAP_MIN);
            evt._currentGap = baseGap / effectiveSpeed;
        }
    } else if (evt._phase === 'gap') {
        if (sincePhaseStart >= evt._currentGap) {
            advanceChannel(evt);
            evt._phase = 'show';
            evt._phaseStart = channelElapsed;
        }
    }
}

function drawChannel(ctx, evt) {
    if (evt._phase !== 'show' || !evt._overlay) return;

    if (evt.type === 'image_channel') {
        if (sharedPreloadedImages.length === 0) return;
        const img = sharedPreloadedImages[evt._currentIdx];
        if (!img) return;
        const ov = evt._overlay;
        ctx.drawImage(img, ov.srcX, ov.srcY, ov.srcW, ov.srcH, ov.x, ov.y, ov.w, ov.h);
    } else if (evt.type === 'video_channel') {
        if (sharedPreloadedVideos.length === 0) return;
        const vid = sharedPreloadedVideos[evt._currentIdx];
        if (!vid || vid.readyState < 2) return;
        const ov = evt._overlay;
        ctx.drawImage(vid, ov.x, ov.y, ov.w, ov.h);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 7: AUDIO CHANNEL (chained playback until hard cut)
// ─────────────────────────────────────────────────────────────────────────────

function setupAudioChannel(evt, audioCtx) {
    if (!evt._audioElements) return;

    // Filter out failed loads
    evt._validElements = evt._audioElements.filter(Boolean);
    if (evt._validElements.length === 0) return;

    const now = audioCtx.currentTime;
    evt._gainNodes = [];

    // Connect each element to Web Audio
    evt._validElements.forEach((el, i) => {
        try {
            const source = audioCtx.createMediaElementSource(el);
            const gainNode = audioCtx.createGain();
            gainNode.gain.setValueAtTime(evt.gain, now);
            source.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            evt._gainNodes.push(gainNode);
        } catch (e) {
            console.warn(`Cascata v2: ${evt.subtype}[${i}] setup error`, e.message);
        }
    });

    // Chain: event-driven (no gap — fires immediately when audio ends)
    evt._validElements.forEach((el, i) => {
        el.addEventListener('ended', () => {
            if (!isPlaying) return;
            const nextIdx = (i + 1) % evt._validElements.length;
            const nextEl = evt._validElements[nextIdx];
            nextEl.currentTime = 0;
            nextEl.play().catch(() => {});
            console.log(`Cascata v2: ${evt.subtype}[${nextIdx}] TOCANDO (chain)`);
        });
    });

    evt._audioStarted = false;

    console.log(`Cascata v2: ${evt.subtype} channel setup — ${evt._validElements.length} elementos`);
}

function startAudioChannel(evt, elapsed, scoreDuration) {
    if (evt._audioStarted || !evt._validElements || evt._validElements.length === 0) return;
    evt._audioStarted = true;

    const el = evt._validElements[0];
    el.currentTime = 0;
    const p = el.play();
    if (p) {
        p.then(() => console.log(`Cascata v2: ${evt.subtype}[0] TOCANDO`))
         .catch(e => console.error(`Cascata v2: ${evt.subtype} play ERRO`, e.message));
    }

    // Fade in/out for all audio channels
    if (evt._gainNodes.length > 0) {
        const now = audioCtx.currentTime;
        const remaining = scoreDuration - elapsed;

        // Spectral: 3s fade in, 3s fade out ending 5s before hard cut
        // Ambient: 2s fade in, 2s fade out ending at hard cut
        const fadeInDur = evt.subtype === 'spectral' ? 3 : 2;
        const fadeOutDur = evt.subtype === 'spectral' ? 3 : 2;
        const endOffset = 0;

        const fadeOutEndFromNow = remaining - endOffset;
        const fadeOutStartFromNow = fadeOutEndFromNow - fadeOutDur;

        evt._gainNodes.forEach(gn => {
            gn.gain.cancelScheduledValues(now);
            // Fade in: 0 → target
            gn.gain.setValueAtTime(0, now);
            gn.gain.linearRampToValueAtTime(evt.gain, now + fadeInDur);

            // Fade out (only if there's enough time)
            if (fadeOutStartFromNow > fadeInDur) {
                gn.gain.setValueAtTime(evt.gain, now + fadeOutStartFromNow);
                gn.gain.linearRampToValueAtTime(0, now + fadeOutEndFromNow);
            }
        });

        console.log(`Cascata v2: ${evt.subtype} fade — in ${fadeInDur}s, out ${fadeOutDur}s ending ${fadeOutEndFromNow.toFixed(1)}s from now`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 8: PLAYBACK ENGINE
// ─────────────────────────────────────────────────────────────────────────────

let audioCtx = null;
let scoreData = null;
let playbackStart = 0;
let isPlaying = false;
let isLoading = false;
let pulsePhase = 0;        // continuous 0→4 cycle accumulator
let lastPulseTime = 0;
let currentPlaybackRate = 1.0;
let allGainNodes = [];

// Transition state: null → 'waitGrid' → 'hold' → playing
let transitionState = null;
let pendingScore = null;

function startPlayback(score) {
    scoreData = score;
    isPlaying = true;
    currentPlaybackRate = 1.0;
    allGainNodes = [];

    // audioCtx already created in startCascata() on user gesture
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    // Start shared videos (loop, channels pick which to draw)
    sharedPreloadedVideos.forEach(vid => {
        vid.loop = true;
        vid.muted = true;
        vid.currentTime = Math.random() * (vid.duration || 1);
        const p = vid.play();
        if (p) p.catch(e => console.warn('Cascata v2: vid play error', e.message));
    });

    // Setup audio channels
    score.events.forEach(evt => {
        if (evt.type === 'audio_channel') {
            setupAudioChannel(evt, audioCtx);
            if (evt._gainNodes) {
                allGainNodes.push(...evt._gainNodes);
            }
        }
    });

    playbackStart = performance.now();
    console.log(`Cascata v2: playback iniciado (${score.duration}s)`);
}

function updatePlayback() {
    if (!isPlaying || !scoreData) return;

    const elapsed = (performance.now() - playbackStart) / 1000;

    if (elapsed >= scoreData.duration) {
        hardCut();
        return;
    }

    // White bg + drifting particles
    drawCascataBackground(elapsed, scoreData.duration);

    const ctx = drawingContext;
    const speedMult = getSpeedMultiplier(elapsed, scoreData.duration);

    scoreData.events.forEach(evt => {
        if (elapsed < evt.enterAt) return;

        if (evt.type === 'audio_channel') {
            if (!evt._audioStarted) startAudioChannel(evt, elapsed, scoreData.duration);
            // Chaining handled by 'ended' event listeners (no polling needed)
        } else if (evt.type === 'image_channel' || evt.type === 'video_channel') {
            const channelElapsed = elapsed - evt.enterAt;
            if (evt._phase === undefined) initChannel(evt);
            updateChannel(evt, channelElapsed, speedMult);
            drawChannel(ctx, evt);
        }
    });

    // Video acceleration in last phase
    if (elapsed >= scoreData.accelStart) {
        const accelElapsed = elapsed - scoreData.accelStart;
        const accelSteps = Math.floor(accelElapsed / ACCEL_INTERVAL);
        const targetRate = 1.0 + accelSteps * ACCEL_STEP;

        if (targetRate !== currentPlaybackRate) {
            currentPlaybackRate = targetRate;
            sharedPreloadedVideos.forEach(v => {
                try { v.playbackRate = currentPlaybackRate; } catch (e) {}
            });
        }
    }
}

function hardCut() {
    isPlaying = false;
    console.log('Cascata v2: CORTE SECO');

    // Silence all audio instantly
    if (audioCtx) {
        const now = audioCtx.currentTime;
        allGainNodes.forEach(g => {
            try {
                g.gain.cancelScheduledValues(now);
                g.gain.setValueAtTime(0, now);
            } catch (e) {}
        });
    }

    // Pause all audio elements
    if (scoreData) {
        scoreData.events.forEach(evt => {
            if (evt.type === 'audio_channel' && evt._validElements) {
                evt._validElements.forEach(el => {
                    try { el.pause(); } catch (e) {}
                });
            }
        });
    }

    // Pause shared videos
    sharedPreloadedVideos.forEach(v => {
        try { v.pause(); } catch (e) {}
    });

    resetGridCells();
    background(GRID_BG[0], GRID_BG[1], GRID_BG[2]);
    drawGrid();
    showButton();
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 9: UI CONTROLLER
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
            // Cleanup audio channel elements
            if (evt.type === 'audio_channel') {
                if (evt._validElements) {
                    evt._validElements.forEach(el => {
                        if (el.parentNode) {
                            try { el.pause(); el.removeAttribute('src'); } catch (e) {}
                            el.parentNode.removeChild(el);
                        }
                    });
                }
                evt._audioElements = null;
                evt._validElements = null;
                evt._gainNodes = null;
                evt._audioStarted = false;
            }
            evt._phase = undefined;
            evt._overlay = null;
        });
    }

    // Cleanup shared videos
    sharedPreloadedVideos.forEach(v => {
        try { v.pause(); v.removeAttribute('src'); } catch (e) {}
        if (v.parentNode) v.parentNode.removeChild(v);
    });
    sharedPreloadedImages = [];
    sharedPreloadedVideos = [];

    // Cleanup orphaned elements
    document.querySelectorAll('video[style*="display: none"], audio[style*="display: none"]').forEach(el => {
        try { el.pause(); el.removeAttribute('src'); } catch (e) {}
        if (el.parentNode) el.parentNode.removeChild(el);
    });

    scoreData = null;
    allGainNodes = [];

    // NOTE: audioCtx NOT closed — reused across cascatas
    resetGridCells();
    transitionState = null;
    pendingScore = null;
}

async function startCascata() {
    if (!dataLoaded) {
        console.warn('Cascata v2: dados ainda carregando');
        return;
    }

    hideButton();
    cleanup();

    // AudioContext on user gesture (before async preload)
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        console.log('Cascata v2: AudioContext criado no click');
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => console.log('Cascata v2: AudioContext resumed'));
    }

    const score = generateScore();

    showProgress();
    isLoading = true;
    pulsePhase = 0;
    lastPulseTime = 0;
    await preloadScore(score, (loaded, total) => {
        updateProgress(loaded, total);
    });

    isLoading = false;
    hideProgress();
    pendingScore = score;
    transitionState = 'waitGrid';
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 10: RESPONSIVE GRID-PARTICLES
// Background = GRID_BG (solid). Only dark cells exist as objects.
// Before cascata: half fade out (1s) leaving equidistant pattern, then move.
// ─────────────────────────────────────────────────────────────────────────────

let gridCells = [];
let cellSize = 16;
let fadeStart = 0;

function buildGridCells(w, h) {
    cellSize = Math.min(w, h) / GRID_DENSITY;
    const cols = Math.ceil(w / cellSize);
    const rows = Math.ceil(h / cellSize);

    gridCells = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if ((r + c) % 2 !== 0) { // only dark positions
                gridCells.push({
                    x: c * cellSize,
                    y: r * cellSize,
                    row: r, col: c,
                    // Even-row darks survive (no corner touching after fade)
                    willSurvive: (r % 2 === 0),
                    isParticle: false,
                    vx: 0, vy: 0
                });
            }
        }
    }
}

function prepareTransition() {
    // Assign velocities to surviving cells (they'll move after fade)
    for (const c of gridCells) {
        if (c.willSurvive) {
            c.isParticle = true;
            const angle = Math.random() * Math.PI * 2;
            const baseSpeed = 8 + Math.random() * 24;
            c.vx = Math.cos(angle) * baseSpeed;
            c.vy = Math.sin(angle) * baseSpeed;
        }
    }
}

function resetGridCells() {
    for (const c of gridCells) {
        c.isParticle = false;
        c.vx = 0;
        c.vy = 0;
        c.x = c.col * cellSize;
        c.y = c.row * cellSize;
    }
}

function drawGrid() {
    const ctx = drawingContext;
    const cs = cellSize;
    const clr = GRID_CELL_COLOR;
    ctx.fillStyle = `rgb(${clr[0]},${clr[1]},${clr[2]})`;
    for (const c of gridCells) {
        ctx.fillRect(c.x, c.y, cs, cs);
    }
}

// Fade phase: non-surviving cells fade out (1s), surviving stay solid
function drawFadePhase(fadeElapsed) {
    background(GRID_BG[0], GRID_BG[1], GRID_BG[2]);

    const ctx = drawingContext;
    const cs = cellSize;
    const clr = GRID_CELL_COLOR;
    const fadeProg = Math.min(fadeElapsed / 1.0, 1);

    // Draw surviving cells (full opacity)
    ctx.fillStyle = `rgb(${clr[0]},${clr[1]},${clr[2]})`;
    for (const c of gridCells) {
        if (c.willSurvive) {
            ctx.fillRect(c.x, c.y, cs, cs);
        }
    }

    // Draw fading cells
    if (fadeProg < 1) {
        ctx.fillStyle = `rgba(${clr[0]},${clr[1]},${clr[2]},${1 - fadeProg})`;
        for (const c of gridCells) {
            if (!c.willSurvive) {
                ctx.fillRect(c.x, c.y, cs, cs);
            }
        }
    }
}

function updateAndDrawParticles(ctx, dt, speedMult) {
    const clr = GRID_CELL_COLOR;
    ctx.fillStyle = `rgb(${clr[0]},${clr[1]},${clr[2]})`;

    const speed = speedMult * dt;
    const w = width;
    const h = height;
    const cs = cellSize;

    for (const p of gridCells) {
        if (!p.isParticle) continue;

        p.x += p.vx * speed;
        p.y += p.vy * speed;

        if (p.x < -cs) p.x += w + cs;
        else if (p.x > w) p.x -= w + cs;
        if (p.y < -cs) p.y += h + cs;
        else if (p.y > h) p.y -= h + cs;

        ctx.fillRect(p.x, p.y, cs, cs);
    }
}

// Loading pulse: grid breathes (light bg → white → light bg → gray)
function drawLoadingPulse() {
    background(GRID_BG[0], GRID_BG[1], GRID_BG[2]);
    drawGrid();

    const phase = pulsePhase % 4;
    let alpha;
    if (phase < 2) {
        // Brighten toward white
        alpha = Math.sin(Math.PI * phase / 2) * 0.35;
        drawingContext.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    } else {
        // Darken slightly toward gray
        alpha = Math.sin(Math.PI * (phase - 2) / 2) * 0.15;
        drawingContext.fillStyle = `rgba(180, 185, 200, ${alpha})`;
    }
    drawingContext.fillRect(0, 0, width, height);
}

// Cascata playback: solid bg + particles drifting
function drawCascataBackground(elapsed, duration) {
    background(GRID_BG[0], GRID_BG[1], GRID_BG[2]);

    const dt = 1 / 60;
    const speedMult = getSpeedMultiplier(elapsed, duration);
    updateAndDrawParticles(drawingContext, dt, speedMult);
}

function advancePulse(intervalSec) {
    const now = performance.now();
    if (lastPulseTime > 0) {
        const dt = (now - lastPulseTime) / 1000;
        pulsePhase += dt / intervalSec;
    }
    lastPulseTime = now;
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 11: CANVAS 16:9 SIZING
// ─────────────────────────────────────────────────────────────────────────────

function calc16x9(viewportFraction) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxW = vw * viewportFraction;
    const maxH = vh * viewportFraction;

    let w = maxW;
    let h = w * 9 / 16;

    if (h > maxH) {
        h = maxH;
        w = h * 16 / 9;
    }

    return { w: Math.floor(w), h: Math.floor(h) };
}

function applyCanvasSize() {
    const { w, h } = calc16x9(0.85);
    const container = document.getElementById('p5-container');
    container.style.width = w + 'px';
    container.style.height = h + 'px';
    resizeCanvas(w, h);
    buildGridCells(w, h);
}

// ─────────────────────────────────────────────────────────────────────────────
// P5.JS HOOKS
// ─────────────────────────────────────────────────────────────────────────────

function setup() {
    const { w, h } = calc16x9(0.85);
    const container = document.getElementById('p5-container');
    container.style.width = w + 'px';
    container.style.height = h + 'px';

    const cnv = createCanvas(w, h);
    cnv.parent('p5-container');

    buildGridCells(w, h);

    initUI();
    loadData();
}

function draw() {
    if (isPlaying) {
        updatePlayback();
    } else if (transitionState === 'waitGrid') {
        advancePulse(PULSE_LOADING);
        drawLoadingPulse();
        // Wait for pulse to reach grid state (alpha ≈ 0)
        const phase = pulsePhase % 2;
        if (phase < 0.03 && pulsePhase > 0.5) {
            transitionState = 'fade';
            fadeStart = performance.now();
            prepareTransition();
        }
    } else if (transitionState === 'fade') {
        // Half cells fade out (1s), then cascata starts
        const fadeElapsed = (performance.now() - fadeStart) / 1000;
        drawFadePhase(fadeElapsed);
        if (fadeElapsed >= 1.0) {
            transitionState = null;
            startPlayback(pendingScore);
        }
    } else if (isLoading) {
        advancePulse(PULSE_LOADING);
        drawLoadingPulse();
    } else {
        // Idle: solid bg + all dark cells
        background(GRID_BG[0], GRID_BG[1], GRID_BG[2]);
        drawGrid();
    }
}

function windowResized() {
    applyCanvasSize();
    if (!isPlaying) {
        background(GRID_BG[0], GRID_BG[1], GRID_BG[2]);
        drawGrid();
    }
}
