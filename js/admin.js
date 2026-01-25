// admin.js - Admin moderation panel

// Auth check
let currentUser = null;

async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        // Not logged in - redirect to login
        window.location.href = 'admin-login.html';
        return false;
    }

    currentUser = session.user;

    // Update UI with user email
    const userEmailEl = document.getElementById('userEmail');
    if (userEmailEl) {
        userEmailEl.textContent = currentUser.email;
    }

    return true;
}

// Logout handler
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.href = 'admin-login.html';
        });
    }
}

// Tab configuration
const TAB_CONFIG = {
    dreams: { table: 'dreams', label: 'Sonhos', textField: 'text', hasAudio: true, hasText: true },
    prospections: { table: 'prospections', label: 'Prospecções', textField: 'text', hasAudio: true, hasText: true },
    purges: { table: 'purges', label: 'Descarregos', textField: 'text', hasAudio: false, hasText: true },
    daily_life: { table: 'daily_life', label: 'Cotidiano', textField: 'text', hasAudio: false, hasText: true }
};

let allContent = {};
let filteredContent = [];
let currentFilter = { status: 'all', sensitivity: 'all' };
let currentPage = 1;
let currentTab = 'dreams';
const itemsPerPage = 10;

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication first
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) return;

    // Setup logout button
    setupLogout();

    // Setup tab buttons
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            const newTab = this.dataset.tab;
            if (newTab !== currentTab) {
                currentTab = newTab;
                currentPage = 1;
                currentFilter.status = 'all';
                currentFilter.sensitivity = 'all';

                // Update tab button states
                tabBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                // Update filter buttons
                document.querySelectorAll('.filter-btn').forEach((b, idx) => {
                    b.classList.toggle('active', idx === 0);
                });
                document.getElementById('sensitivityFilter').value = 'all';

                // Load new content
                await loadContent();
            }
        });
    });

    // Setup filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
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
    document.getElementById('refreshBtn').addEventListener('click', loadContent);

    // Pagination
    document.getElementById('prevBtn').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderContent();
        }
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredContent.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderContent();
        }
    });

    // Load initial content
    await loadContent();
});

/**
 * Load content for current tab
 */
async function loadContent() {
    showLoading(true);

    try {
        const config = TAB_CONFIG[currentTab];
        const { data, error } = await supabaseClient
            .from(config.table)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allContent[currentTab] = data || [];
        applyFilters();
        updateStats();

    } catch (error) {
        console.error(`Erro ao carregar ${currentTab}:`, error);
        showMessage(`Erro ao carregar ${TAB_CONFIG[currentTab].label}`, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Apply current filters to content list
 */
function applyFilters() {
    const content = allContent[currentTab] || [];
    filteredContent = content.filter(item => {
        if (currentFilter.status !== 'all' && item.status !== currentFilter.status) {
            return false;
        }
        if (currentFilter.sensitivity !== 'all' && item.sensitivity !== currentFilter.sensitivity) {
            return false;
        }
        return true;
    });

    renderContent();
}

/**
 * Render content for current page
 */
function renderContent() {
    const contentList = document.getElementById('contentList');
    const emptyState = document.getElementById('emptyState');
    const pagination = document.getElementById('pagination');

    const totalPages = Math.ceil(filteredContent.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageContent = filteredContent.slice(startIndex, endIndex);

    if (pageContent.length === 0) {
        contentList.innerHTML = '';
        emptyState.hidden = false;
        pagination.hidden = true;
        return;
    }

    emptyState.hidden = true;
    contentList.innerHTML = pageContent.map(item => renderContentCard(item)).join('');

    pageContent.forEach(item => {
        attachActions(item.id);
    });

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
 * Render a single content card
 */
function renderContentCard(item) {
    const config = TAB_CONFIG[currentTab];
    const date = formatDate(item.created_at);
    const statusLabel = getStatusLabel(item.status);
    const sensitivityLabel = getSensitivityLabel(item.sensitivity);

    // Text content
    let textHTML = '';
    if (config.hasText && item[config.textField]) {
        textHTML = `<div class="content-text">${escapeHtml(item[config.textField])}</div>`;
    }

    // Media content
    let mediaHTML = '';
    const hasMedia = item.audio_url || item.image_url || item.video_url;
    if (hasMedia) {
        mediaHTML = '<div class="content-media">';

        if (config.hasAudio && item.audio_url) {
            mediaHTML += `
                <div class="media-item">
                    <audio controls>
                        <source src="${item.audio_url}" type="audio/mpeg">
                    </audio>
                </div>
            `;
        }

        if (item.image_url) {
            mediaHTML += `
                <div class="media-item">
                    <img src="${item.image_url}" alt="Imagem">
                </div>
            `;
        }

        if (item.video_url) {
            mediaHTML += `
                <div class="media-item">
                    <video controls>
                        <source src="${item.video_url}" type="video/mp4">
                    </video>
                </div>
            `;
        }

        mediaHTML += '</div>';
    }

    // Action buttons
    let actionsHTML = '';
    if (item.status === 'pending') {
        actionsHTML = `
            <button class="btn-approve" data-action="approve">Aprovar</button>
            <button class="btn-reject" data-action="reject">Rejeitar</button>
        `;
    } else if (item.status === 'approved') {
        actionsHTML = `
            <button class="btn-reject" data-action="reject">Rejeitar</button>
            <button class="btn-delete" data-action="delete">Deletar</button>
        `;
    } else if (item.status === 'rejected') {
        actionsHTML = `
            <button class="btn-undo" data-action="approve">Aprovar</button>
            <button class="btn-delete" data-action="delete">Deletar</button>
        `;
    }

    return `
        <div class="content-card ${item.status}" data-item-id="${item.id}">
            <div class="content-header">
                <div class="content-meta">
                    <span>📅 ${date}</span>
                    <span>🔒 ${sensitivityLabel}</span>
                    <span>🆔 ${item.id.slice(0, 8)}...</span>
                </div>
                <span class="content-status ${item.status}">${statusLabel}</span>
            </div>

            ${textHTML}
            ${mediaHTML}

            <div class="content-actions" data-item-id="${item.id}">
                ${actionsHTML}
            </div>
        </div>
    `;
}

/**
 * Attach event listeners to content actions
 */
function attachActions(itemId) {
    const actionsContainer = document.querySelector(`.content-actions[data-item-id="${itemId}"]`);
    if (!actionsContainer) return;

    const buttons = actionsContainer.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.addEventListener('click', async function() {
            const action = this.dataset.action;
            await handleAction(itemId, action);
        });
    });
}

/**
 * Handle content actions (approve, reject, delete)
 */
async function handleAction(itemId, action) {
    const confirmMessages = {
        approve: `Aprovar este ${TAB_CONFIG[currentTab].label.toLowerCase()} para publicação?`,
        reject: `Rejeitar este ${TAB_CONFIG[currentTab].label.toLowerCase()}?`,
        delete: `ATENÇÃO: Deletar permanentemente este ${TAB_CONFIG[currentTab].label.toLowerCase()}? Esta ação não pode ser desfeita.`
    };

    if (!confirm(confirmMessages[action])) {
        return;
    }

    showLoading(true);

    try {
        const config = TAB_CONFIG[currentTab];
        const table = config.table;

        if (action === 'delete') {
            const { error } = await supabaseClient.from(table).delete().eq('id', itemId);
            if (error) throw error;
            showMessage(`${TAB_CONFIG[currentTab].label} deletado`, 'success');
        } else {
            const newStatus = action === 'approve' ? 'approved' : 'rejected';
            const { error } = await supabaseClient.from(table).update({ status: newStatus }).eq('id', itemId);
            if (error) throw error;
            const message = action === 'approve' ? `${TAB_CONFIG[currentTab].label} aprovado` : `${TAB_CONFIG[currentTab].label} rejeitado`;
            showMessage(message, 'success');
        }

        await loadContent();

    } catch (error) {
        console.error('Erro na ação:', error);
        showMessage('Erro ao executar ação', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Update statistics for all tables
 */
function updateStats() {
    let pending = 0, approved = 0, rejected = 0, total = 0;

    Object.keys(TAB_CONFIG).forEach(tab => {
        const content = allContent[tab] || [];
        pending += content.filter(d => d.status === 'pending').length;
        approved += content.filter(d => d.status === 'approved').length;
        rejected += content.filter(d => d.status === 'rejected').length;
        total += content.length;
    });

    document.getElementById('statPending').textContent = pending;
    document.getElementById('statApproved').textContent = approved;
    document.getElementById('statRejected').textContent = rejected;
    document.getElementById('statTotal').textContent = total;
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
