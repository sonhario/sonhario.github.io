// visualizacao.js - Dream visualization and random navigation

let approvedDreams = [];
let currentDreamIndex = -1;
let viewedDreams = new Set();

document.addEventListener('DOMContentLoaded', async function() {
    // Load approved dreams
    await loadApprovedDreams();

    // Setup buttons
    document.getElementById('randomDreamBtn').addEventListener('click', showRandomDream);
    document.getElementById('nextDreamBtn').addEventListener('click', showRandomDream);

    // Load stats
    await loadStats();
});

/**
 * Load all approved dreams
 */
async function loadApprovedDreams() {
    try {
        approvedDreams = await getApprovedDreams();
        console.log(`Loaded ${approvedDreams.length} approved dreams`);
    } catch (error) {
        console.error('Erro ao carregar sonhos:', error);
        showMessage('Erro ao carregar sonhos', 'error');
    }
}

/**
 * Show a random dream
 */
async function showRandomDream() {
    if (approvedDreams.length === 0) {
        showMessage('Nenhum sonho publicado ainda. Seja o primeiro a compartilhar!', 'info');
        return;
    }

    showLoading(true);

    try {
        // Get random dream (avoid repeats if possible)
        let dream;
        let attempts = 0;
        const maxAttempts = 10;

        do {
            dream = randomElement(approvedDreams);
            attempts++;
        } while (viewedDreams.has(dream.id) && attempts < maxAttempts && viewedDreams.size < approvedDreams.length);

        // If we've seen all dreams, reset
        if (viewedDreams.size >= approvedDreams.length) {
            viewedDreams.clear();
        }

        // Mark as viewed
        viewedDreams.add(dream.id);

        // Display dream
        displayDream(dream);

        // Track contamination
        await trackContamination(dream.id);

    } catch (error) {
        console.error('Erro ao exibir sonho:', error);
        showMessage('Erro ao exibir sonho', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Display dream content
 */
function displayDream(dream) {
    const emptyState = document.getElementById('emptyState');
    const dreamContent = document.getElementById('dreamContent');
    const dreamText = document.getElementById('dreamText');
    const dreamMedia = document.getElementById('dreamMedia');

    // Hide empty state, show content
    emptyState.hidden = true;
    dreamContent.hidden = false;

    // Display text
    dreamText.textContent = dream.text;

    // Display media
    let mediaHTML = '';

    if (dream.audio_url) {
        mediaHTML += `
            <audio controls autoplay>
                <source src="${dream.audio_url}" type="audio/mpeg">
                Seu navegador não suporta áudio.
            </audio>
        `;
    }

    if (dream.image_url) {
        mediaHTML += `
            <img src="${dream.image_url}" alt="Imagem do sonho">
        `;
    }

    if (dream.video_url) {
        mediaHTML += `
            <video controls>
                <source src="${dream.video_url}" type="video/mp4">
                Seu navegador não suporta vídeo.
            </video>
        `;
    }

    dreamMedia.innerHTML = mediaHTML;

    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Track contamination (view)
 */
async function trackContamination(dreamId) {
    try {
        const sessionId = getSessionId();

        const { error } = await supabase
            .from('contaminations')
            .insert({
                dream_id: dreamId,
                session_id: sessionId
            });

        if (error) {
            // Ignore duplicate errors (same session viewing same dream)
            if (error.code !== '23505') {
                console.error('Erro ao rastrear contaminação:', error);
            }
        }
    } catch (error) {
        console.error('Erro ao rastrear contaminação:', error);
    }
}

/**
 * Load statistics
 */
async function loadStats() {
    try {
        // Total approved dreams
        const { count: dreamsCount, error: dreamsError } = await supabase
            .from('purges')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'approved')
            .neq('sensitivity', 'private');

        if (dreamsError) throw dreamsError;

        document.getElementById('totalDreams').textContent = dreamsCount || 0;

        // Total contaminations
        const { count: contaminationsCount, error: contaminationsError } = await supabase
            .from('contaminations')
            .select('*', { count: 'exact', head: true });

        if (contaminationsError) throw contaminationsError;

        document.getElementById('totalContaminations').textContent = contaminationsCount || 0;

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        document.getElementById('totalDreams').textContent = '-';
        document.getElementById('totalContaminations').textContent = '-';
    }
}
