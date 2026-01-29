// ═══════════════════════════════════════════════════════════════════════════════
// AUDIO-CONTROLLER.JS - Camadas 2 e 3 de Áudio
// Sonhário v1.1
//
// Camada 2: Áudio 10s (AudioLDM2) com crossfade A/B de 3s
// Camada 3: Áudio espectral (voz) com fade dinâmico e duck da camada 2
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// ESTADO COMPARTILHADO
// ─────────────────────────────────────────────────────────────────────────────

let audioCtx = null;
let audioLayerActive = false;

// ─────────────────────────────────────────────────────────────────────────────
// CAMADA 2: ÁUDIO 10s COM CROSSFADE
// ─────────────────────────────────────────────────────────────────────────────

let layer2Master = null;     // GainNode master da camada 2 (para duck)
let slotA = null;            // { element, gain, label }
let slotB = null;
let activeSlot = null;
let audioCrossfading = false;

const CROSSFADE_AT = 7;
const CROSSFADE_DURATION = 3;

// ─────────────────────────────────────────────────────────────────────────────
// CAMADA 3: ÁUDIO ESPECTRAL COM FADE DINÂMICO
// ─────────────────────────────────────────────────────────────────────────────

let spectralElement = null;
let spectralGain = null;     // GainNode do espectral
let spectralState = 'idle';  // 'idle' | 'fading_in' | 'peak' | 'fading_out'
let spectralTimer = null;
let spectralMaterials = [];  // materiais que têm audio_espectral_path

const SPECTRAL_FADE = 5;              // duração do fade in/out (segundos)
const SPECTRAL_INTERVAL_MIN = 30000;  // intervalo mínimo entre aparições (ms)
const SPECTRAL_INTERVAL_MAX = 300000; // intervalo máximo (ms)
const SPECTRAL_PEAK_MIN = 30000;      // duração mínima no pico (ms)
const SPECTRAL_PEAK_MAX = 120000;     // duração máxima no pico (ms)
const LAYER2_DUCK_LEVEL = 0.1;        // volume da camada 2 quando espectral está no pico
const SPECTRAL_PEAK_VOLUME = 1.5;     // volume do espectral no pico (>1 para compensar voz mais baixa)

// ═══════════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════════

function initAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // Master gain da camada 2 (permite duck global)
    layer2Master = audioCtx.createGain();
    layer2Master.gain.value = 1;
    layer2Master.connect(audioCtx.destination);

    // Slots A/B da camada 2
    slotA = createAudioSlot('A');
    slotB = createAudioSlot('B');

    // Elemento espectral da camada 3
    spectralElement = document.createElement('audio');
    spectralElement.style.display = 'none';
    spectralElement.preload = 'auto';
    spectralElement.crossOrigin = 'anonymous';
    spectralElement.loop = false;
    document.body.appendChild(spectralElement);

    const spectralSource = audioCtx.createMediaElementSource(spectralElement);
    spectralGain = audioCtx.createGain();
    spectralGain.gain.value = 0;
    spectralSource.connect(spectralGain);
    spectralGain.connect(audioCtx.destination);

    console.log('✅ AudioContext inicializado (Camadas 2+3)');
}

function createAudioSlot(label) {
    const element = document.createElement('audio');
    element.style.display = 'none';
    element.preload = 'auto';
    element.crossOrigin = 'anonymous';
    document.body.appendChild(element);

    const source = audioCtx.createMediaElementSource(element);
    const gain = audioCtx.createGain();
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(layer2Master); // → master → destination

    return { element, gain, label };
}

// ═══════════════════════════════════════════════════════════════════════════════
// START / STOP (chamados pelo remix.js)
// ═══════════════════════════════════════════════════════════════════════════════

function startAudioLayer() {
    if (!audioCtx) initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    audioLayerActive = true;
    audioCrossfading = false;

    // Camada 2: primeiro áudio
    activeSlot = slotA;
    loadAudioSlot(slotA, () => {
        slotA.gain.gain.setValueAtTime(1, audioCtx.currentTime);
    });

    // Camada 3: indexar materiais com espectral e agendar primeira aparição
    spectralMaterials = materialsData.filter(m => m.audio_espectral_path !== null);
    console.log(`👻 ${spectralMaterials.length} materiais com áudio espectral`);

    if (spectralMaterials.length > 0) {
        scheduleNextSpectral();
    }

    console.log('🔊 Camadas 2+3 iniciadas');
}

function stopAudioLayer() {
    audioLayerActive = false;
    audioCrossfading = false;

    // Camada 2
    slotA.element.pause();
    slotB.element.pause();
    slotA.gain.gain.value = 0;
    slotB.gain.gain.value = 0;
    layer2Master.gain.value = 1;

    // Camada 3
    spectralElement.pause();
    spectralGain.gain.value = 0;
    spectralState = 'idle';
    if (spectralTimer) {
        clearTimeout(spectralTimer);
        spectralTimer = null;
    }

    console.log('🔇 Camadas 2+3 paradas');
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAMADA 2: LOAD + CROSSFADE
// ═══════════════════════════════════════════════════════════════════════════════

function loadAudioSlot(slot, onReady) {
    const material = getRandomMaterial();
    if (!material || !material.audio_10s_path) return;

    const audioPath = getMediaPath(material.audio_10s_path);
    console.log(`🔊 Áudio ${slot.label}: ${material.id}`);

    slot.element.src = audioPath;
    slot.element.load();

    if (onReady) {
        slot.element.addEventListener('canplay', onReady, { once: true });
    }

    slot.element.addEventListener('error', () => {
        const err = slot.element.error;
        console.error(`❌ Áudio ${slot.label}: ${err ? err.message : '?'}`);
        if (slot === activeSlot && audioLayerActive) {
            loadAudioSlot(slot, onReady);
        }
    }, { once: true });

    const p = slot.element.play();
    if (p) p.catch(e => console.error(`❌ Áudio ${slot.label} play:`, e.message));
}

function checkAudioCrossfade() {
    if (!audioLayerActive || !activeSlot) return;
    if (activeSlot.element.readyState < 2 || audioCrossfading) return;

    const t = activeSlot.element.currentTime;
    const dur = activeSlot.element.duration;
    if (!dur || isNaN(dur)) return;

    if (t >= CROSSFADE_AT) {
        audioCrossfading = true;

        const nextSlot = (activeSlot === slotA) ? slotB : slotA;
        const now = audioCtx.currentTime;

        loadAudioSlot(nextSlot, () => {
            activeSlot.gain.gain.setValueAtTime(1, now);
            activeSlot.gain.gain.linearRampToValueAtTime(0, now + CROSSFADE_DURATION);

            nextSlot.gain.gain.setValueAtTime(0, now);
            nextSlot.gain.gain.linearRampToValueAtTime(1, now + CROSSFADE_DURATION);

            console.log(`🔀 Crossfade: ${activeSlot.label} → ${nextSlot.label}`);
        });

        activeSlot.element.addEventListener('ended', () => {
            activeSlot.element.pause();
            activeSlot = nextSlot;
            audioCrossfading = false;
        }, { once: true });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAMADA 3: ÁUDIO ESPECTRAL - FADE DINÂMICO
// ═══════════════════════════════════════════════════════════════════════════════

function scheduleNextSpectral() {
    if (!audioLayerActive) return;

    const interval = SPECTRAL_INTERVAL_MIN +
        Math.random() * (SPECTRAL_INTERVAL_MAX - SPECTRAL_INTERVAL_MIN);

    console.log(`👻 Próximo espectral em ${(interval / 1000).toFixed(0)}s`);

    spectralTimer = setTimeout(() => {
        if (audioLayerActive) startSpectralAppearance();
    }, interval);
}

function startSpectralAppearance() {
    const material = spectralMaterials[Math.floor(Math.random() * spectralMaterials.length)];
    if (!material) return;

    const audioPath = getMediaPath(material.audio_espectral_path);
    console.log(`👻 Espectral FADE-IN: ${material.id}`);

    spectralElement.src = audioPath;
    spectralElement.load();

    const startPlay = () => {
        spectralState = 'fading_in';
        const now = audioCtx.currentTime;

        // Fade-in espectral: 0 → 1.2
        spectralGain.gain.setValueAtTime(0, now);
        spectralGain.gain.linearRampToValueAtTime(SPECTRAL_PEAK_VOLUME, now + SPECTRAL_FADE);

        // Duck camada 2: 1 → 0.2
        layer2Master.gain.setValueAtTime(layer2Master.gain.value, now);
        layer2Master.gain.linearRampToValueAtTime(LAYER2_DUCK_LEVEL, now + SPECTRAL_FADE);

        // Após fade-in completo: entrar no pico
        spectralTimer = setTimeout(() => {
            spectralState = 'peak';

            // Duração aleatória no pico
            const peakDuration = SPECTRAL_PEAK_MIN +
                Math.random() * (SPECTRAL_PEAK_MAX - SPECTRAL_PEAK_MIN);

            console.log(`👻 Espectral PICO por ${(peakDuration / 1000).toFixed(0)}s`);

            // Após o pico: fade-out
            spectralTimer = setTimeout(() => {
                if (audioLayerActive) endSpectralAppearance();
            }, peakDuration);
        }, SPECTRAL_FADE * 1000);
    };

    spectralElement.addEventListener('canplay', startPlay, { once: true });

    // Quando o áudio atual termina, carregar próxima voz aleatória
    spectralElement.addEventListener('ended', () => {
        if (spectralState === 'fading_in' || spectralState === 'peak') {
            loadNextSpectralAudio();
        }
    }, { once: true });

    spectralElement.addEventListener('error', () => {
        console.error('❌ Espectral: erro ao carregar');
        spectralState = 'idle';
        scheduleNextSpectral();
    }, { once: true });

    const p = spectralElement.play();
    if (p) p.catch(e => console.error('❌ Espectral play:', e.message));
}

function loadNextSpectralAudio() {
    const material = spectralMaterials[Math.floor(Math.random() * spectralMaterials.length)];
    if (!material) return;

    const audioPath = getMediaPath(material.audio_espectral_path);
    console.log(`👻 Próxima voz: ${material.id}`);

    spectralElement.src = audioPath;
    spectralElement.load();

    // Encadear: quando este também terminar, carregar outro
    spectralElement.addEventListener('ended', () => {
        if (spectralState === 'fading_in' || spectralState === 'peak') {
            loadNextSpectralAudio();
        }
    }, { once: true });

    const p = spectralElement.play();
    if (p) p.catch(e => console.error('❌ Espectral play:', e.message));
}

function endSpectralAppearance() {
    spectralState = 'fading_out';
    const now = audioCtx.currentTime;

    console.log('👻 Espectral FADE-OUT');

    // Fade-out espectral: 1 → 0
    spectralGain.gain.setValueAtTime(spectralGain.gain.value, now);
    spectralGain.gain.linearRampToValueAtTime(0, now + SPECTRAL_FADE);

    // Restaurar camada 2: 0.2 → 1
    layer2Master.gain.setValueAtTime(layer2Master.gain.value, now);
    layer2Master.gain.linearRampToValueAtTime(1, now + SPECTRAL_FADE);

    // Após fade-out: parar e agendar próximo
    spectralTimer = setTimeout(() => {
        spectralElement.pause();
        spectralState = 'idle';
        scheduleNextSpectral();
    }, SPECTRAL_FADE * 1000);
}
