// Relatos v2 - Sonhario
// Layout A — editorial spread, fundo off-white

const SUPABASE_URL = 'https://nxanctcrqdcbbuhlktzb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW5jdGNycWRjYmJ1aGxrdHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNTUxOTEsImV4cCI6MjA4NDkzMTE5MX0.TkeaWGSR0MM0_VLJaOMFchdbkkM_fRPM5Zr53g7R7zk';

const TIPO_LABELS = { sonhos: 'sonho', prospeccoes: 'prospecção', descarregos: 'descarrego' };
const FILTER_LABELS = { todos: 'tudo', sonhos: 'sonhos', prospeccoes: 'prospecções', descarregos: 'descarregos' };

let allMaterials = [];
let currentFilter = 'todos';
let lastShown = null;

async function init() {
    renderControls();
    await loadMaterials();
}

function renderControls() {
    const row = document.getElementById('control-row');

    const btn = document.createElement('button');
    btn.className = 'btn-mostrar';
    btn.textContent = 'Mostrar [1] relato e materiais gerados a partir dele em:';
    btn.addEventListener('click', () => showRandom());

    const dropdown = document.createElement('div');
    dropdown.className = 'custom-dropdown';

    const selected = document.createElement('div');
    selected.className = 'dropdown-selected';
    selected.textContent = FILTER_LABELS['todos'];

    const menu = document.createElement('div');
    menu.className = 'dropdown-menu';

    ['todos', 'sonhos', 'prospeccoes', 'descarregos'].forEach(val => {
        const opt = document.createElement('button');
        opt.className = 'dropdown-option' + (val === 'todos' ? ' active' : '');
        opt.textContent = FILTER_LABELS[val];
        opt.addEventListener('click', () => {
            currentFilter = val;
            selected.textContent = FILTER_LABELS[val];
            menu.querySelectorAll('.dropdown-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            menu.classList.remove('open');
        });
        menu.appendChild(opt);
    });

    selected.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('open');
    });
    document.addEventListener('click', () => menu.classList.remove('open'));

    dropdown.appendChild(selected);
    dropdown.appendChild(menu);

    row.appendChild(btn);
    row.appendChild(dropdown);
}

async function loadMaterials() {
    const feed = document.getElementById('feed');
    feed.innerHTML = '<div class="loading-msg">carregando...</div>';
    try {
        const q = new URLSearchParams({
            select: 'external_id,tipo,titulo,descricao,texto_url,video_url,audio_10s_url,audio_espectral_url,imagem_url',
            order: 'uploaded_at.desc'
        });
        const res = await fetch(`${SUPABASE_URL}/rest/v1/materials?${q}`, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
        });
        if (!res.ok) throw new Error(res.status);
        allMaterials = (await res.json()).filter(m =>
            m.tipo === 'sonhos' || m.tipo === 'prospeccoes' || m.tipo === 'descarregos'
        );
        feed.innerHTML = '';
    } catch (e) {
        feed.innerHTML = `<div class="empty-msg">erro: ${e.message}</div>`;
    }
}

function showRandom() {
    const pool = currentFilter === 'todos'
        ? allMaterials
        : allMaterials.filter(m => m.tipo === currentFilter);
    if (!pool.length) {
        document.getElementById('count').textContent = '';
        document.getElementById('feed').innerHTML = '<div class="empty-msg">nenhum relato</div>';
        return;
    }
    lastShown = pool[Math.floor(Math.random() * pool.length)];
    document.getElementById('count').textContent = `${pool.length} relatos`;

    render(lastShown);
}

function render(m) {
    const feed = document.getElementById('feed');
    feed.innerHTML = '';
    feed.appendChild(makeTipo(m));
    feed.appendChild(buildLayout(m));
}

// ── Helpers ──

function makeTipo(m) {
    const el = document.createElement('div');
    el.className = 'relato-tipo';
    el.textContent = '[' + (TIPO_LABELS[m.tipo] || m.tipo).toUpperCase() + ']';
    return el;
}

function makeTexto(m) {
    const wrap = document.createElement('div');
    const texto = document.createElement('div');
    texto.className = 'relato-texto';

    // Always load full text if available, otherwise use descricao
    if (m.texto_url) {
        texto.textContent = m.descricao || '';
        wrap.appendChild(texto);
        fetch(m.texto_url)
            .then(r => r.ok ? r.text() : null)
            .then(t => { if (t) texto.textContent = t; })
            .catch(() => {});
    } else {
        texto.textContent = m.descricao || '';
        wrap.appendChild(texto);
    }
    return wrap;
}

function makeLabel(text) {
    const el = document.createElement('div');
    el.className = 'media-label';
    el.textContent = text;
    return el;
}

function makeImage(m) {
    const img = document.createElement('img');
    img.className = 'relato-img';
    img.src = m.imagem_url;
    img.loading = 'lazy';
    img.alt = '';
    return img;
}

function makeVideo(m) {
    const v = document.createElement('video');
    v.className = 'relato-video';
    v.src = m.video_url;
    v.autoplay = true;
    v.loop = true;
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.crossOrigin = 'anonymous';
    return v;
}

// ── Layout A — Editorial spread ──

function buildLayout(m) {
    const root = document.createElement('div');
    root.className = 'layout-a';

    const colText = document.createElement('div');
    colText.className = 'col-text';

    // Voz processada first if present, then texto original
    if (m.audio_espectral_url) {
        colText.appendChild(makeLabel('voz processada'));
        colText.appendChild(createAudioPlayer(m.audio_espectral_url));
    }

    colText.appendChild(makeLabel('texto original'));
    colText.appendChild(makeTexto(m));

    const colMedia = document.createElement('div');
    colMedia.className = 'col-media';
    let hasMedia = false;

    function addMediaBlock(label, element) {
        const block = document.createElement('div');
        block.className = 'media-block';
        block.appendChild(makeLabel(label));
        block.appendChild(element);
        colMedia.appendChild(block);
        hasMedia = true;
    }

    if (m.imagem_url) addMediaBlock('imagem gerada', makeImage(m));
    if (m.audio_10s_url) addMediaBlock('paisagem sonora', createAudioPlayer(m.audio_10s_url));
    if (m.video_url) addMediaBlock('video gerado', makeVideo(m));

    root.appendChild(colText);
    if (hasMedia) root.appendChild(colMedia);
    return root;
}

// ── Audio player (waveform) ──

function createAudioPlayer(src) {
    const wrapper = document.createElement('div');
    wrapper.className = 'audio-player';

    const row = document.createElement('div');
    row.className = 'waveform-row';

    const btn = document.createElement('button');
    btn.className = 'audio-play-btn';
    btn.textContent = '\u25B6';

    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'waveform-wrap';
    const canvas = document.createElement('canvas');
    canvasWrap.appendChild(canvas);

    row.appendChild(btn);
    row.appendChild(canvasWrap);
    wrapper.appendChild(row);

    const audio = document.createElement('audio');
    audio.src = src;
    audio.preload = 'metadata';
    audio.crossOrigin = 'anonymous';
    wrapper.appendChild(audio);

    let rawAudio = null, waveformData = null, animId = null;

    function sizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const cssW = canvasWrap.clientWidth, cssH = canvasWrap.clientHeight;
        if (cssW === 0) return;
        canvas.width = cssW * dpr;
        canvas.height = cssH * dpr;
        canvas.style.width = cssW + 'px';
        canvas.style.height = cssH + 'px';
        if (rawAudio) buildWaveform();
    }

    function buildWaveform() {
        const dpr = window.devicePixelRatio || 1;
        const barW = 2 * dpr, gap = 1 * dpr;
        const bars = Math.max(1, Math.floor(canvas.width / (barW + gap)));
        const step = Math.floor(rawAudio.length / bars);
        if (step === 0) return;
        waveformData = new Float32Array(bars);
        for (let i = 0; i < bars; i++) {
            let sum = 0;
            const start = i * step;
            for (let j = start; j < start + step && j < rawAudio.length; j++) sum += Math.abs(rawAudio[j]);
            waveformData[i] = sum / step;
        }
        let max = 0;
        for (let i = 0; i < waveformData.length; i++) if (waveformData[i] > max) max = waveformData[i];
        if (max > 0) for (let i = 0; i < waveformData.length; i++) waveformData[i] /= max;
        drawWaveform(canvas, waveformData, 0);
    }

    fetch(src).then(r => r.arrayBuffer())
        .then(buf => new (window.AudioContext || window.webkitAudioContext)().decodeAudioData(buf))
        .then(decoded => { rawAudio = decoded.getChannelData(0); sizeCanvas(); })
        .catch(() => { rawAudio = new Float32Array(100).fill(0.3); sizeCanvas(); });

    new ResizeObserver(sizeCanvas).observe(canvasWrap);

    function renderLoop() {
        if (!waveformData) { animId = requestAnimationFrame(renderLoop); return; }
        drawWaveform(canvas, waveformData, audio.duration ? audio.currentTime / audio.duration : 0);
        if (!audio.paused) animId = requestAnimationFrame(renderLoop);
    }

    btn.addEventListener('click', () => {
        if (audio.paused) {
            audio.play(); btn.textContent = '\u275A\u275A'; animId = requestAnimationFrame(renderLoop);
        } else {
            audio.pause(); btn.textContent = '\u25B6'; if (animId) cancelAnimationFrame(animId);
        }
    });
    audio.addEventListener('ended', () => {
        btn.textContent = '\u25B6'; if (animId) cancelAnimationFrame(animId);
        if (waveformData) drawWaveform(canvas, waveformData, 1);
    });
    canvasWrap.addEventListener('click', (e) => {
        if (!audio.duration) return;
        const pct = (e.clientX - canvasWrap.getBoundingClientRect().left) / canvasWrap.clientWidth;
        audio.currentTime = pct * audio.duration;
        if (waveformData) drawWaveform(canvas, waveformData, pct);
    });

    return wrapper;
}

function drawWaveform(canvas, data, progress) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, w, h);
    const barW = 2 * dpr, gap = 1 * dpr;
    const playedIdx = Math.floor(progress * data.length);
    const minH = 2 * dpr;
    for (let i = 0; i < data.length; i++) {
        const x = i * (barW + gap);
        const barH = Math.max(minH, data[i] * h * 0.9);
        ctx.fillStyle = i <= playedIdx ? 'rgba(26,29,46,0.55)' : 'rgba(26,29,46,0.12)';
        ctx.fillRect(x, (h - barH) / 2, barW, barH);
    }
}

init();
