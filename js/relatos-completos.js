// Relatos Completos - Sonhario
// Carrega materiais do Supabase e renderiza um relato aleatório por clique

const SUPABASE_URL = 'https://nxanctcrqdcbbuhlktzb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW5jdGNycWRjYmJ1aGxrdHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNTUxOTEsImV4cCI6MjA4NDkzMTE5MX0.TkeaWGSR0MM0_VLJaOMFchdbkkM_fRPM5Zr53g7R7zk';

const TIPO_LABELS = {
    sonhos: 'sonho',
    prospeccoes: 'prospecção',
    descarregos: 'descarrego'
};

const FILTER_LABELS = {
    todos: 'tudo',
    sonhos: 'sonhos',
    prospeccoes: 'prospecções',
    descarregos: 'descarregos'
};

let allMaterials = [];
let currentFilter = 'todos';

async function init() {
    renderControls();
    await loadMaterials();
}

function renderControls() {
    const row = document.getElementById('control-row');

    const btn = document.createElement('button');
    btn.id = 'show-btn';
    btn.textContent = 'mostrar um relato original e materiais gerados a partir dele em:';
    btn.addEventListener('click', () => {
        showRandomRelato();
    });

    const select = document.createElement('select');
    select.id = 'filter-select';
    ['todos', 'sonhos', 'prospeccoes', 'descarregos'].forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = FILTER_LABELS[val];
        select.appendChild(opt);
    });
    select.addEventListener('change', () => {
        currentFilter = select.value;
    });

    row.appendChild(btn);
    row.appendChild(select);
}

async function loadMaterials() {
    const feed = document.getElementById('feed');
    feed.innerHTML = '<div class="loading-msg">Carregando relatos...</div>';

    try {
        const query = new URLSearchParams({
            select: 'external_id,tipo,titulo,descricao,texto_url,video_url,audio_10s_url,audio_espectral_url,imagem_url',
            order: 'uploaded_at.desc'
        });

        const response = await fetch(`${SUPABASE_URL}/rest/v1/materials?${query}`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (!response.ok) throw new Error(`${response.status}`);
        allMaterials = await response.json();
        // Only text-based types (exclude legacy and cotidiano)
        allMaterials = allMaterials.filter(m => m.tipo === 'sonhos' || m.tipo === 'prospeccoes' || m.tipo === 'descarregos');
        feed.innerHTML = '';
    } catch (error) {
        feed.innerHTML = `<div class="empty-msg">Erro ao carregar: ${error.message}</div>`;
    }
}

function showRandomRelato() {
    const feed = document.getElementById('feed');
    const countEl = document.getElementById('count');

    const filtered = currentFilter === 'todos'
        ? allMaterials
        : allMaterials.filter(m => m.tipo === currentFilter);

    if (filtered.length === 0) {
        countEl.textContent = '';
        feed.innerHTML = '<div class="empty-msg">Nenhum relato encontrado</div>';
        return;
    }

    const random = filtered[Math.floor(Math.random() * filtered.length)];
    countEl.textContent = `1 de ${filtered.length}`;
    feed.innerHTML = '';
    feed.appendChild(createRelatoCard(random));
}

function createRelatoCard(m) {
    const card = document.createElement('div');
    card.className = 'relato';

    // Tipo tag
    const tipo = document.createElement('span');
    tipo.className = 'relato-tipo';
    tipo.textContent = '[' + (TIPO_LABELS[m.tipo] || m.tipo).toUpperCase() + ']';
    card.appendChild(tipo);

    // Texto
    if (m.descricao) {
        const texto = document.createElement('div');
        texto.className = 'relato-texto';
        texto.textContent = m.descricao;

        if (m.descricao.length >= 490 && m.texto_url) {
            texto.classList.add('truncated');
            card.appendChild(texto);

            const btn = document.createElement('button');
            btn.className = 'btn-expandir';
            btn.textContent = 'ver completo';
            btn.addEventListener('click', async () => {
                try {
                    const res = await fetch(m.texto_url);
                    if (res.ok) {
                        texto.textContent = await res.text();
                        texto.classList.remove('truncated');
                        btn.remove();
                    }
                } catch (e) {
                    // keep truncated
                }
            });
            card.appendChild(btn);
        } else {
            card.appendChild(texto);
        }
    }

    // Media
    const media = document.createElement('div');
    media.className = 'relato-media';
    let hasMedia = false;

    if (m.audio_espectral_url) {
        media.appendChild(createAudioPlayer(m.audio_espectral_url, 'voz processada'));
        hasMedia = true;
    }

    if (m.imagem_url) {
        const label = document.createElement('label');
        label.textContent = 'imagem gerada';
        media.appendChild(label);
        const img = document.createElement('img');
        img.src = m.imagem_url;
        img.loading = 'lazy';
        img.alt = '';
        media.appendChild(img);
        hasMedia = true;
    }

    if (m.audio_10s_url) {
        media.appendChild(createAudioPlayer(m.audio_10s_url, 'paisagem sonora'));
        hasMedia = true;
    }

    if (m.video_url) {
        const label = document.createElement('label');
        label.textContent = 'video gerado';
        media.appendChild(label);
        const video = document.createElement('video');
        video.src = m.video_url;
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.crossOrigin = 'anonymous';
        media.appendChild(video);
        hasMedia = true;
    }

    if (hasMedia) card.appendChild(media);

    return card;
}

function createAudioPlayer(src, labelText) {
    const wrapper = document.createElement('div');
    wrapper.className = 'audio-player';

    const label = document.createElement('label');
    label.textContent = labelText;
    wrapper.appendChild(label);

    const audio = document.createElement('audio');
    audio.src = src;
    audio.preload = 'metadata';
    audio.crossOrigin = 'anonymous';

    const btn = document.createElement('button');
    btn.className = 'audio-play-btn';
    btn.textContent = '\u25B6';
    btn.addEventListener('click', () => {
        if (audio.paused) {
            audio.play();
            btn.textContent = '\u275A\u275A';
        } else {
            audio.pause();
            btn.textContent = '\u25B6';
        }
    });
    audio.addEventListener('ended', () => {
        btn.textContent = '\u25B6';
    });

    wrapper.appendChild(btn);
    wrapper.appendChild(audio);
    return wrapper;
}

init();
