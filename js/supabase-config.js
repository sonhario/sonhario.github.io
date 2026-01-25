/**
 * Sonhário Virtual - Configuração Supabase
 *
 * IMPORTANTE: Após criar projeto no Supabase, substitua os valores abaixo
 * com as credenciais reais do seu projeto.
 *
 * Como obter as credenciais:
 * 1. Acesse https://supabase.com
 * 2. Crie projeto "sonhario-virtual"
 * 3. Vá em Project Settings > API
 * 4. Copie "Project URL" e "anon public" key
 */

const SUPABASE_URL = 'https://nxanctcrqdcbbuhlktzb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW5jdGNycWRjYmJ1aGxrdHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNTUxOTEsImV4cCI6MjA4NDkzMTE5MX0.TkeaWGSR0MM0_VLJaOMFchdbkkM_fRPM5Zr53g7R7zk';

// Inicializar cliente Supabase
// Certifique-se de incluir o SDK do Supabase no HTML antes deste arquivo:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

let supabaseClient;

function initSupabase() {
  if (typeof supabase === 'undefined') {
    console.error('Supabase SDK não carregado. Inclua o script do Supabase no HTML.');
    return null;
  }

  if (SUPABASE_URL === 'YOUR_SUPABASE_PROJECT_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    console.error('Configure as credenciais do Supabase em supabase-config.js');
    return null;
  }

  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseClient;
}

// ============================================
// DATABASE OPERATIONS
// ============================================

/**
 * Busca sonhos aprovados (visualização pública)
 * @param {number} limit - Limite de resultados
 * @returns {Promise<Array>}
 */
async function getApprovedDreams(limit = 100) {
  const { data, error } = await supabaseClient
    .from('dreams')
    .select('*')
    .eq('status', 'approved')
    .neq('sensitivity', 'private')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Busca sonhos pendentes (painel admin)
 * @returns {Promise<Array>}
 */
async function getPendingDreams() {
  const { data, error } = await supabaseClient
    .from('dreams')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Busca sonho por ID
 * @param {string} dreamId
 * @returns {Promise<object>}
 */
async function getDreamById(dreamId) {
  const { data, error } = await supabaseClient
    .from('dreams')
    .select('*')
    .eq('id', dreamId)

  if (error) throw error;
  return data;
}

/**
 * Cria novo sonho (upload)
 * @param {object} dreamData
 * @returns {Promise<object>}
 */
async function createDream(dreamData) {
  // Usar fetch direto para evitar header Prefer: return=representation
  const response = await fetch(`${SUPABASE_URL}/rest/v1/dreams`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(dreamData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao criar sonho');
  }

  return null; // 201 Created não retorna dados
}

/**
 * Cria nova prospecção (upload)
 * @param {object} prospectionData
 * @returns {Promise<object>}
 */
async function createProspection(prospectionData) {
  // Usar fetch direto para evitar header Prefer: return=representation
  const response = await fetch(`${SUPABASE_URL}/rest/v1/prospections`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(prospectionData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao criar prospecção');
  }

  return null; // 201 Created não retorna dados
}

/**
 * Cria novo descarrego (upload)
 * @param {object} purgeData
 * @returns {Promise<object>}
 */
async function createPurge(purgeData) {
  // Usar fetch direto para evitar header Prefer: return=representation
  const response = await fetch(`${SUPABASE_URL}/rest/v1/purges`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(purgeData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao criar descarrego');
  }

  return null; // 201 Created não retorna dados
}

/**
 * Cria novo cotidiano (upload)
 * @param {object} dailyData
 * @returns {Promise<object>}
 */
async function createDaily(dailyData) {
  // Usar fetch direto para evitar header Prefer: return=representation
  const response = await fetch(`${SUPABASE_URL}/rest/v1/daily_life`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(dailyData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao criar cotidiano');
  }

  return null; // 201 Created não retorna dados
}

/**
 * Atualiza sonho (moderação)
 * @param {string} dreamId
 * @param {object} updates
 * @returns {Promise<object>}
 */
async function updateDream(dreamId, updates) {
  const { data, error} = await supabaseClient
    .from('dreams')
    .update(updates)
    .eq('id', dreamId)

  if (error) throw error;
  return data;
}

/**
 * Incrementa contador de views
 * @param {string} dreamId
 * @returns {Promise<void>}
 */
async function incrementViews(dreamId) {
  const { error } = await supabaseClient.rpc('increment_views', { dream_id: dreamId });
  if (error) console.error('Erro ao incrementar views:', error);
}

/**
 * Registra contaminação (tracking de visualização)
 * @param {string} dreamId - ID do sonho visualizado
 * @param {string} sessionId - Session ID do visitante
 * @returns {Promise<void>}
 */
async function trackContamination(dreamId, sessionId) {
  const { error } = await supabaseClient
    .from('contaminations')
    .insert([{
      source_dream_id: dreamId,
      viewer_session_id: sessionId,
      viewed_at: new Date().toISOString()
    }]);

  if (error) console.error('Erro ao registrar contaminação:', error);
}

// ============================================
// STORAGE OPERATIONS
// ============================================

/**
 * Upload de arquivo para Supabase Storage
 * @param {File} file - Arquivo a fazer upload
 * @param {string} bucket - Nome do bucket (ex: 'dream-media')
 * @param {string} path - Caminho dentro do bucket
 * @returns {Promise<string>} URL pública do arquivo
 */
async function uploadFile(file, bucket = 'dream-media', path = '') {
  const fileName = `${Date.now()}-${file.name}`;
  const filePath = path ? `${path}/${fileName}` : fileName;

  const { data, error } = await supabaseClient.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  // Obter URL pública
  const { data: { publicUrl } } = supabaseClient.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Remove arquivo do storage
 * @param {string} url - URL pública do arquivo
 * @param {string} bucket - Nome do bucket
 * @returns {Promise<void>}
 */
async function deleteFile(url, bucket = 'dream-media') {
  // Extrair caminho do arquivo da URL
  const urlParts = url.split(`${bucket}/`);
  if (urlParts.length < 2) {
    throw new Error('URL inválida');
  }
  const filePath = urlParts[1];

  const { error } = await supabaseClient.storage
    .from(bucket)
    .remove([filePath]);

  if (error) throw error;
}

// ============================================
// STATISTICS
// ============================================

/**
 * Busca estatísticas gerais
 * @returns {Promise<object>}
 */
async function getStats() {
  const { data: dreams, error } = await supabaseClient
    .from('dreams')
    .select('status, views_count');

  if (error) throw error;

  const stats = {
    total: dreams.length,
    approved: dreams.filter(d => d.status === 'approved').length,
    pending: dreams.filter(d => d.status === 'pending').length,
    rejected: dreams.filter(d => d.status === 'rejected').length,
    totalViews: dreams.reduce((sum, d) => sum + (d.views_count || 0), 0)
  };

  return stats;
}

// ============================================
// INITIALIZATION
// ============================================

// Inicializar Supabase ao carregar página
document.addEventListener('DOMContentLoaded', () => {
  supabaseClient = initSupabase();
  if (!supabaseClient) {
    console.warn('Supabase não inicializado. Configure as credenciais.');
  }
});
