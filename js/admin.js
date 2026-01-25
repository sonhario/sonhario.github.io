// admin.js - Admin moderation panel

let dreams = [];
let filteredDreams = [];
let currentFilter = { status: 'all', sensitivity: 'all' };
let currentPage = 1;
const dreamsPerPage = 10;

document.addEventListener('DOMContentLoaded', async function() {
    // Load dreams on init
    await loadDreams();

    // Setup filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active state
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Apply filter
            currentFilter.status = this.dataset.status;
            currentPage = 1;
            applyFilters();
        });
    });

    // Sensitivity filter
    document.getElementById('sensitivityFilter').addEventListener('change', function() {
        currentFilter.sensitivity = this.value;
        currentPage = 1;
        applyFilters();
    });

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', loadDreams);

    // Pagination
    document.getElementById('prevBtn').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderDreams();
        }
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredDreams.length / dreamsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderDreams();
        }
    });
});

/**
 * Load all dreams from Supabase
 */
async function loadDreams() {
    showLoading(true);

    try {
        // Fetch all dreams (no status filter on DB level)
        const { data, error } = await supabase
            .from('dreams')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        dreams = data || [];
        applyFilters();
        updateStats();

    } catch (error) {
        console.error('Erro ao carregar sonhos:', error);
        showMessage('Erro ao carregar sonhos', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Apply current filters to dreams list
 */
function applyFilters() {
    filteredDreams = dreams.filter(dream => {
        // Status filter
        if (currentFilter.status !== 'all' && dream.status !== currentFilter.status) {
            return false;
        }

        // Sensitivity filter
        if (currentFilter.sensitivity !== 'all' && dream.sensitivity !== currentFilter.sensitivity) {
            return false;
        }

        return true;
    });

    renderDreams();
}

/**
 * Render dreams for current page
 */
function renderDreams() {
    const dreamsList = document.getElementById('dreamsList');
    const emptyState = document.getElementById('emptyState');
    const pagination = document.getElementById('pagination');

    // Calculate pagination
    const totalPages = Math.ceil(filteredDreams.length / dreamsPerPage);
    const startIndex = (currentPage - 1) * dreamsPerPage;
    const endIndex = startIndex + dreamsPerPage;
    const pageDreams = filteredDreams.slice(startIndex, endIndex);

    // Empty state
    if (pageDreams.length === 0) {
        dreamsList.innerHTML = '';
        emptyState.hidden = false;
        pagination.hidden = true;
        return;
    }

    emptyState.hidden = true;

    // Render dreams
    dreamsList.innerHTML = pageDreams.map(dream => renderDreamCard(dream)).join('');

    // Attach event listeners
    pageDreams.forEach(dream => {
        attachDreamActions(dream.id);
    });

    // Update pagination
    if (totalPages > 1) {
        pagination.hidden = false;
        document.getElementById('currentPage').textContent = currentPage;
        document.getElementById('totalPages').textContent = totalPages;
        document.getElementById('prevBtn').disabled = currentPage === 1;
        document.getElementById('nextBtn').disabled = currentPage === totalPages;
    } else {
        pagination.hidden = true;
    }
}

/**
 * Render a single dream card
 */
function renderDreamCard(dream) {
    const date = formatDate(dream.created_at);
    const statusLabel = getStatusLabel(dream.status);
    const sensitivityLabel = getSensitivityLabel(dream.sensitivity);

    // Media content
    let mediaHTML = '';
    if (dream.audio_url || dream.image_url || dream.video_url) {
        mediaHTML = '<div class="dream-media">';

        if (dream.audio_url) {
            mediaHTML += `
                <div class="media-item">
                    <audio controls>
                        <source src="${dream.audio_url}" type="audio/mpeg">
                    </audio>
                </div>
            `;
        }

        if (dream.image_url) {
            mediaHTML += `
                <div class="media-item">
                    <img src="${dream.image_url}" alt="Imagem do sonho">
                </div>
            `;
        }

        if (dream.video_url) {
            mediaHTML += `
                <div class="media-item">
                    <video controls>
                        <source src="${dream.video_url}" type="video/mp4">
                    </video>
                </div>
            `;
        }

        mediaHTML += '</div>';
    }

    // Action buttons based on status
    let actionsHTML = '';
    if (dream.status === 'pending') {
        actionsHTML = `
            <button class="btn-approve" data-action="approve">Aprovar</button>
            <button class="btn-reject" data-action="reject">Rejeitar</button>
        `;
    } else if (dream.status === 'approved') {
        actionsHTML = `
            <button class="btn-reject" data-action="reject">Rejeitar</button>
            <button class="btn-delete" data-action="delete">Deletar</button>
        `;
    } else if (dream.status === 'rejected') {
        actionsHTML = `
            <button class="btn-undo" data-action="approve">Aprovar</button>
            <button class="btn-delete" data-action="delete">Deletar</button>
        `;
    }

    return `
        <div class="dream-card ${dream.status}" data-dream-id="${dream.id}">
            <div class="dream-header">
                <div class="dream-meta">
                    <span>📅 ${date}</span>
                    <span>🔒 ${sensitivityLabel}</span>
                    <span>🆔 ${dream.id.slice(0, 8)}...</span>
                </div>
                <span class="dream-status ${dream.status}">${statusLabel}</span>
            </div>

            <div class="dream-text">${escapeHtml(dream.text)}</div>

            ${mediaHTML}

            <div class="dream-actions" data-dream-id="${dream.id}">
                ${actionsHTML}
            </div>
        </div>
    `;
}

/**
 * Attach event listeners to dream actions
 */
function attachDreamActions(dreamId) {
    const actionsContainer = document.querySelector(`.dream-actions[data-dream-id="${dreamId}"]`);
    if (!actionsContainer) return;

    const buttons = actionsContainer.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.addEventListener('click', async function() {
            const action = this.dataset.action;
            await handleDreamAction(dreamId, action);
        });
    });
}

/**
 * Handle dream actions (approve, reject, delete)
 */
async function handleDreamAction(dreamId, action) {
    const confirmMessages = {
        approve: 'Aprovar este sonho para publicação?',
        reject: 'Rejeitar este sonho?',
        delete: 'ATENÇÃO: Deletar permanentemente este sonho? Esta ação não pode ser desfeita.'
    };

    if (!confirm(confirmMessages[action])) {
        return;
    }

    showLoading(true);

    try {
        if (action === 'delete') {
            // Delete dream
            const { error } = await supabase
                .from('dreams')
                .delete()
                .eq('id', dreamId);

            if (error) throw error;

            showMessage('Sonho deletado', 'success');

        } else {
            // Update status
            const newStatus = action === 'approve' ? 'approved' : 'rejected';
            const { error } = await supabase
                .from('dreams')
                .update({ status: newStatus })
                .eq('id', dreamId);

            if (error) throw error;

            const message = action === 'approve' ? 'Sonho aprovado' : 'Sonho rejeitado';
            showMessage(message, 'success');
        }

        // Reload dreams
        await loadDreams();

    } catch (error) {
        console.error('Erro na ação:', error);
        showMessage('Erro ao executar ação', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Update statistics
 */
function updateStats() {
    const pending = dreams.filter(d => d.status === 'pending').length;
    const approved = dreams.filter(d => d.status === 'approved').length;
    const rejected = dreams.filter(d => d.status === 'rejected').length;

    document.getElementById('statPending').textContent = pending;
    document.getElementById('statApproved').textContent = approved;
    document.getElementById('statRejected').textContent = rejected;
    document.getElementById('statTotal').textContent = dreams.length;
}

/**
 * Get status label in Portuguese
 */
function getStatusLabel(status) {
    const labels = {
        pending: 'Pendente',
        approved: 'Aprovado',
        rejected: 'Rejeitado'
    };
    return labels[status] || status;
}

/**
 * Get sensitivity label in Portuguese
 */
function getSensitivityLabel(sensitivity) {
    const labels = {
        general: 'Geral',
        sensitive: 'Sensível',
        private: 'Privado'
    };
    return labels[sensitivity] || sensitivity;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
