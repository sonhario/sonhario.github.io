/**
 * Sonhário Virtual - Funções Utilitárias
 * Funções reutilizáveis entre upload, admin e visualização
 */

// ============================================
// SESSION & TRACKING
// ============================================

/**
 * Gera ou recupera session ID único para tracking anônimo
 * @returns {string} Session ID (UUID v4)
 */
function getSessionId() {
  let sessionId = localStorage.getItem('sonhario_session_id');

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('sonhario_session_id', sessionId);
  }

  return sessionId;
}

/**
 * Salva último sonho visualizado
 * @param {string} dreamId - ID do sonho
 */
function saveLastViewedDream(dreamId) {
  localStorage.setItem('sonhario_last_dream', dreamId);
  localStorage.setItem('sonhario_last_view_time', Date.now());
}

/**
 * Recupera último sonho visualizado
 * @returns {object|null} {dreamId, timestamp}
 */
function getLastViewedDream() {
  const dreamId = localStorage.getItem('sonhario_last_dream');
  const timestamp = localStorage.getItem('sonhario_last_view_time');

  return dreamId ? { dreamId, timestamp: parseInt(timestamp) } : null;
}

// ============================================
// FILE VALIDATION
// ============================================

/**
 * Valida tamanho de arquivo
 * @param {File} file - Arquivo a validar
 * @param {number} maxSizeMB - Tamanho máximo em MB
 * @returns {boolean}
 */
function validateFileSize(file, maxSizeMB) {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxBytes;
}

/**
 * Valida tipo de arquivo por extensão e MIME type
 * @param {File} file - Arquivo a validar
 * @param {string[]} allowedExtensions - Ex: ['jpg', 'png']
 * @param {string[]} allowedMimeTypes - Ex: ['image/jpeg', 'image/png']
 * @returns {boolean}
 */
function validateFileType(file, allowedExtensions, allowedMimeTypes) {
  const extension = file.name.split('.').pop().toLowerCase();
  const mimeType = file.type.toLowerCase();

  return allowedExtensions.includes(extension) && allowedMimeTypes.includes(mimeType);
}

/**
 * Validação específica para áudio
 * @param {File} file
 * @returns {boolean}
 */
function validateAudioFile(file) {
  const allowedExt = ['mp3', 'wav', 'm4a'];
  const allowedMime = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a'];

  if (!validateFileType(file, allowedExt, allowedMime)) {
    showMessage('Formato de áudio inválido. Use MP3, WAV ou M4A.', 'error');
    return false;
  }

  if (!validateFileSize(file, 10)) {
    showMessage('Arquivo de áudio muito grande. Máximo: 10MB.', 'error');
    return false;
  }

  return true;
}

/**
 * Validação específica para imagem
 * @param {File} file
 * @returns {boolean}
 */
function validateImageFile(file) {
  const allowedExt = ['jpg', 'jpeg', 'png', 'webp'];
  const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];

  if (!validateFileType(file, allowedExt, allowedMime)) {
    showMessage('Formato de imagem inválido. Use JPG, PNG ou WEBP.', 'error');
    return false;
  }

  if (!validateFileSize(file, 5)) {
    showMessage('Arquivo de imagem muito grande. Máximo: 5MB.', 'error');
    return false;
  }

  return true;
}

/**
 * Validação específica para vídeo
 * @param {File} file
 * @returns {boolean}
 */
function validateVideoFile(file) {
  const allowedExt = ['mp4', 'webm', 'mov'];
  const allowedMime = ['video/mp4', 'video/webm', 'video/quicktime'];

  if (!validateFileType(file, allowedExt, allowedMime)) {
    showMessage('Formato de vídeo inválido. Use MP4, WEBM ou MOV.', 'error');
    return false;
  }

  if (!validateFileSize(file, 50)) {
    showMessage('Arquivo de vídeo muito grande. Máximo: 50MB.', 'error');
    return false;
  }

  return true;
}

// ============================================
// FORMATTING & DISPLAY
// ============================================

/**
 * Formata data para exibição
 * @param {string|Date} date
 * @returns {string} Ex: "24 jan 2025"
 */
function formatDate(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
                  'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Formata tamanho de arquivo
 * @param {number} bytes
 * @returns {string} Ex: "2.5 MB"
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Trunca texto com reticências
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// ============================================
// UI HELPERS
// ============================================

/**
 * Mostra mensagem de feedback
 * @param {string} message
 * @param {string} type - 'success', 'error', 'info'
 * @param {number} duration - Duração em ms (0 = permanente)
 */
function showMessage(message, type = 'info', duration = 3000) {
  // Remove mensagens anteriores
  const existing = document.querySelector('.message-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `message-toast message-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
    color: white;
    border-radius: 4px;
    z-index: 10000;
    font-size: 14px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  `;

  document.body.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
}

/**
 * Mostra loading spinner
 * @param {boolean} show
 */
function showLoading(show = true) {
  let spinner = document.getElementById('loading-spinner');

  if (show) {
    if (!spinner) {
      spinner = document.createElement('div');
      spinner.id = 'loading-spinner';
      spinner.innerHTML = '<div class="spinner"></div>';
      spinner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      `;
      document.body.appendChild(spinner);
    }
    spinner.style.display = 'flex';
  } else {
    if (spinner) spinner.style.display = 'none';
  }
}

// ============================================
// RANDOM SELECTION
// ============================================

/**
 * Seleciona elemento aleatório de array
 * @param {Array} array
 * @returns {*} Elemento aleatório ou null se array vazio
 */
function randomElement(array) {
  if (!array || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Embaralha array (Fisher-Yates shuffle)
 * @param {Array} array
 * @returns {Array} Array embaralhado (cópia)
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================
// ERROR HANDLING
// ============================================

/**
 * Loga erro com contexto
 * @param {string} context - Ex: 'upload', 'admin', 'visualizacao'
 * @param {Error} error
 */
function logError(context, error) {
  console.error(`[Sonhário Virtual - ${context}]`, error);

  // Em produção, poderia enviar para serviço de logging
  // Exemplo: Sentry, LogRocket, etc
}

/**
 * Handler genérico de erro Supabase
 * @param {object} error - Erro do Supabase
 * @param {string} context
 * @returns {string} Mensagem user-friendly
 */
function handleSupabaseError(error, context = '') {
  logError(context, error);

  if (error.message.includes('unique constraint')) {
    return 'Este item já existe.';
  }
  if (error.message.includes('not found')) {
    return 'Item não encontrado.';
  }
  if (error.message.includes('permission')) {
    return 'Você não tem permissão para esta ação.';
  }

  return 'Erro ao processar solicitação. Tente novamente.';
}

// ============================================
// EXPORTS (se usar modules)
// ============================================

// Para uso futuro com ES6 modules:
// export { getSessionId, validateAudioFile, ... };
