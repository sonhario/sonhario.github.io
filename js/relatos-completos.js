// Relatos Completos - Sonhario
// Carrega materiais do Supabase e renderiza como feed

const SUPABASE_URL = 'https://nxanctcrqdcbbuhlktzb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW5jdGNycWRjYmJ1aGxrdHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNTUxOTEsImV4cCI6MjA4NDkzMTE5MX0.TkeaWGSR0MM0_VLJaOMFchdbkkM_fRPM5Zr53g7R7zk';

const TIPOS = ['todos', 'sonhos', 'prospeccoes', 'descarregos', 'cotidiano'];
const TIPO_LABELS = {
    sonhos: 'sonho',
    prospeccoes: 'prospecao',
    descarregos: 'descarrego',
    cotidiano: 'cotidiano'
};

let allMaterials = [];
let currentFilter = 'todos';
let shuffleMode = false;

async function init() {
    renderFilters();
    renderShuffleButton();
    await loadMaterials();
}

function renderFilters() {
    const container = document.getElementById('filters');
    TIPOS.forEach(tipo => {
        const btn = document.createElement('button');
        btn.textContent = tipo === 'todos' ? 'todos' : tipo;
        btn.className = tipo === 'todos' ? 'active' : '';
        btn.addEventListener('click', () => {
            currentFilter = tipo;
            container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            shuffleMode = false;
            renderFeed();
        });
        container.appendChild(btn);
    });
}

function renderShuffleButton() {
    const container = document.getElementById('shuffle-container');
    const btn = document.createElement('button');
    btn.id = 'shuffle-btn';
    btn.textContent = 'shuffle';
    btn.addEventListener('click', () => {
        shuffleMode = true;
        renderFeed();
    });
    container.appendChild(btn);
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
        renderFeed();
    } catch (error) {
        feed.innerHTML = `<div class="empty-msg">Erro ao carregar: ${error.message}</div>`;
    }
}

function renderFeed() {
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

    if (shuffleMode) {
        const random = filtered[Math.floor(Math.random() * filtered.length)];
        countEl.textContent = `1 de ${filtered.length}`;
        feed.innerHTML = '';
        feed.appendChild(createRelatoCard(random));
    } else {
        countEl.textContent = `${filtered.length} relato${filtered.length !== 1 ? 's' : ''}`;
        feed.innerHTML = '';
        filtered.forEach(material => {
            feed.appendChild(createRelatoCard(material));
        });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function createRelatoCard(m) {
    const card = document.createElement('div');
    card.className = 'relato';

    // Tipo tag
    const tipo = document.createElement('span');
    tipo.className = 'relato-tipo';
    tipo.textContent = TIPO_LABELS[m.tipo] || m.tipo;
    card.appendChild(tipo);

    // Texto
    if (m.descricao) {
        const texto = document.createElement('div');
        texto.className = 'relato-texto';
        texto.textContent = m.descricao;

        // Se texto parece truncado (500 chars), permitir expandir
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
        const label = document.createElement('label');
        label.textContent = 'voz processada';
        media.appendChild(label);
        const audio = document.createElement('audio');
        audio.src = m.audio_espectral_url;
        audio.controls = true;
        audio.preload = 'metadata';
        audio.crossOrigin = 'anonymous';
        media.appendChild(audio);
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
        const label = document.createElement('label');
        label.textContent = 'paisagem sonora';
        media.appendChild(label);
        const audio = document.createElement('audio');
        audio.src = m.audio_10s_url;
        audio.controls = true;
        audio.preload = 'metadata';
        audio.crossOrigin = 'anonymous';
        media.appendChild(audio);
        hasMedia = true;
    }

    if (m.video_url) {
        const label = document.createElement('label');
        label.textContent = 'video gerado';
        media.appendChild(label);
        const video = document.createElement('video');
        video.src = m.video_url;
        video.controls = true;
        video.preload = 'metadata';
        video.crossOrigin = 'anonymous';
        media.appendChild(video);
        hasMedia = true;
    }

    if (hasMedia) card.appendChild(media);

    return card;
}

init();
