# 🎯 Sistema de Moderação Local - Sonhário Virtual

Sistema para moderar conteúdo localmente no seu computador (ver/ouvir em players rápidos) e depois atualizar status no Supabase.

## 📁 Estrutura de Pastas

```
moderacao/
├── baixar_pendentes.py      # Script 1: Baixa pendentes
├── atualizar_status.py       # Script 2: Atualiza status
├── README.md                 # Este arquivo
├── pendentes/                # Criado automaticamente
│   ├── sonhos/
│   ├── prospeccoes/
│   ├── descarregos/
│   └── cotidiano/
├── aprovados/                # Você move para cá
│   ├── sonhos/
│   ├── prospeccoes/
│   ├── descarregos/
│   └── cotidiano/
└── rejeitados/               # Você move para cá
    ├── sonhos/
    ├── prospeccoes/
    ├── descarregos/
    └── cotidiano/
```

## 🔄 Workflow de Moderação

### 1️⃣ Baixar Pendentes

```bash
cd moderacao
python3 baixar_pendentes.py
```

**O que faz:**
- Busca todos os itens com `status = 'pending'` no Supabase
- Baixa áudios, fotos, vídeos do storage
- Cria arquivo `texto.txt` para cada texto escrito
- Salva `metadata.json` com ID e URLs originais
- Organiza em pastas por tipo e data:
  ```
  pendentes/sonhos/2025-01-25_14-30-00_abc12345/
  ├── texto.txt
  ├── audio.m4a
  └── metadata.json
  ```

### 2️⃣ Moderar Localmente

**No Finder/Explorer:**
1. Abra `moderacao/pendentes/`
2. Navegue por tipo (sonhos, prospeccoes, etc)
3. **Abra cada pasta** e veja/ouça os arquivos
4. **MOVA** a pasta inteira para:
   - `../aprovados/sonhos/` (se aprovar)
   - `../rejeitados/sonhos/` (se rejeitar)

**Dica:** Use QuickLook (Space) no Mac ou visualizador rápido no Windows para ver/ouvir sem abrir.

### 3️⃣ Atualizar Status

```bash
python3 atualizar_status.py
```

**O que faz:**
- Lê todas as pastas em `aprovados/` e `rejeitados/`
- Extrai ID do `metadata.json`
- Atualiza `status` no banco de dados:
  - `aprovados` → `status = 'approved'` (aparece na visualização pública)
  - `rejeitados` → `status = 'rejected'` + **DELETA arquivos do storage**

**⚠️ IMPORTANTE:**
- Rejeitados são **deletados permanentemente** do storage
- Aprovados continuam no storage (só muda status)

### 4️⃣ Repetir Ciclo

Após atualizar status:
```bash
python3 baixar_pendentes.py
```

Só baixa **novos** itens pendentes (os já processados não aparecem).

---

## 📋 Exemplo Completo

**Passo a passo:**

```bash
# 1. Baixar pendentes
cd /Users/fitipe/Desktop/Site_Claude/sonhario.github.io/moderacao
python3 baixar_pendentes.py

# Saída:
# ============================================================
# 📥 Baixando sonhos
# ============================================================
#   📊 3 itens pendentes
#
#   📁 2025-01-25_14-30-00_abc12345
#     ✅ texto.txt
#     ✅ audio.m4a
#     ✅ metadata.json
#   ...

# 2. Moderar no Finder
# - Abrir pendentes/sonhos/
# - Ouvir áudio em velocidade 2x
# - Ler texto.txt
# - MOVER pasta inteira para aprovados/sonhos/ ou rejeitados/sonhos/

# 3. Atualizar status
python3 atualizar_status.py

# Saída:
# ============================================================
# 📂 APROVADOS
# ============================================================
#   📁 sonhos
#     📝 2025-01-25_14-30-00_abc12345
#        ID: abc12345... | Tipo: sonhos
#        ✅ Status → approved
#   ...
# ============================================================
# 📂 REJEITADOS
# ============================================================
#   📁 sonhos
#     📝 2025-01-25_15-00-00_def67890
#        ID: def67890... | Tipo: sonhos
#        ✅ Status → rejected
#        🗑️  Deletando arquivos do storage...
#          ✅ Áudio deletado
#   ...

# 4. Repetir
python3 baixar_pendentes.py
```

---

## 🔍 Estrutura de Pasta Individual

Cada item baixado cria uma pasta com:

**Sonhos/Prospecções:**
```
2025-01-25_14-30-00_abc12345/
├── texto.txt        # Texto do sonho (se enviado)
├── audio.m4a        # Áudio do sonho (se enviado)
└── metadata.json    # ID, URLs, session_id
```

**Cotidiano:**
```
2025-01-25_14-30-00_abc12345/
├── audio.m4a        # Se enviado
├── foto.jpg         # Se enviado
├── video.mp4        # Se enviado
└── metadata.json
```

**Descarregos:**
```
2025-01-25_14-30-00_abc12345/
├── texto.txt
└── metadata.json
```

---

## ❓ FAQ

**P: E se eu mover para a pasta errada?**
R: Sem problema! Basta mover de volta antes de executar `atualizar_status.py`

**P: Posso aprovar só alguns e deixar outros para depois?**
R: Sim! Deixe em `pendentes/` e serão baixados novamente no próximo ciclo.

**P: Como reverter uma aprovação/rejeição?**
R: Use o painel admin web ou SQL direto no Supabase para mudar o status manualmente.

**P: Os arquivos locais são deletados após atualizar status?**
R: NÃO. Ficam em `aprovados/` e `rejeitados/` para você arquivar como quiser.

**P: Posso ver/editar os textos antes de aprovar?**
R: Sim! Edite `texto.txt` localmente. Mas o script NÃO atualiza o texto no banco (só status).

---

## 🎬 Dicas de Moderação Rápida

**Mac:**
- QuickLook (Space): Preview rápido de áudio/imagem/texto
- VLC: Abrir áudios em 2x-3x velocidade
- Arrastar pastas: Cmd+Drag para mover

**Atalhos úteis:**
```bash
# Ver quantos pendentes
ls -la pendentes/sonhos/ | wc -l

# Ver quantos aprovados
ls -la aprovados/sonhos/ | wc -l

# Limpar pastas processadas (após arquivar)
rm -rf aprovados/*/
rm -rf rejeitados/*/
```

---

*Sistema criado para Sonhário Virtual - v1.0*
*Última atualização: 2025-01-25*
