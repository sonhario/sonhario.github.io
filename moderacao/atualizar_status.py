#!/usr/bin/env python3
"""
Atualiza status no Supabase baseado na organização local de pastas

Lê as pastas:
- moderacao/aprovados/[tipo]/[pasta] → status = 'approved'
- moderacao/rejeitados/[tipo]/[pasta] → status = 'rejected' + DELETE do bucket

Extrai ID do metadata.json e atualiza no banco.
"""

import requests
import json
from pathlib import Path
from urllib.parse import urlparse

SUPABASE_URL = 'https://nxanctcrqdcbbuhlktzb.supabase.co'
SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW5jdGNycWRjYmJ1aGxrdHpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM1NTE5MSwiZXhwIjoyMDg0OTMxMTkxfQ.qhEV8LIV4goJFzlUuK_rU6z1hXkT8wKqiWaNS5___mE'

headers = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}'
}

BASE_DIR = Path(__file__).parent

TIPO_TO_TABLE = {
    'sonhos': 'dreams',
    'prospeccoes': 'prospections',
    'descarregos': 'purges',
    'cotidiano': 'daily_life'
}

def delete_file_from_storage(url):
    """Remove arquivo do Supabase Storage"""
    if not url:
        return True

    # Extrair caminho do arquivo da URL
    # URL formato: https://...supabase.co/storage/v1/object/public/dream-media/path/file.ext
    try:
        parts = url.split('/dream-media/')
        if len(parts) < 2:
            print(f"      ⚠️  URL inválida: {url}")
            return False

        file_path = parts[1]

        response = requests.delete(
            f'{SUPABASE_URL}/storage/v1/object/dream-media/{file_path}',
            headers=headers
        )

        if response.status_code in [200, 204]:
            return True
        else:
            print(f"      ⚠️  Erro ao deletar {file_path}: {response.status_code}")
            return False
    except Exception as e:
        print(f"      ❌ Erro: {e}")
        return False

def processar_pasta(pasta_item, status_alvo):
    """Processa uma pasta individual (aprovado ou rejeitado)"""
    metadata_path = pasta_item / 'metadata.json'

    if not metadata_path.exists():
        print(f"    ⚠️  Sem metadata.json: {pasta_item.name}")
        return False

    with open(metadata_path, 'r', encoding='utf-8') as f:
        metadata = json.load(f)

    item_id = metadata['id']
    tipo = metadata['tipo']
    tabela = TIPO_TO_TABLE.get(tipo)

    if not tabela:
        print(f"    ❌ Tipo desconhecido: {tipo}")
        return False

    print(f"    📝 {pasta_item.name}")
    print(f"       ID: {item_id[:8]}... | Tipo: {tipo}")

    # Atualizar status no banco
    update_data = {'status': status_alvo}

    response = requests.patch(
        f'{SUPABASE_URL}/rest/v1/{tabela}?id=eq.{item_id}',
        headers=headers,
        json=update_data
    )

    if response.status_code in [200, 204]:
        print(f"       ✅ Status → {status_alvo}")

        # Se rejeitado, deletar arquivos do storage
        if status_alvo == 'rejected':
            print(f"       🗑️  Deletando arquivos do storage...")

            if metadata.get('audio_url'):
                delete_file_from_storage(metadata['audio_url'])
                print(f"         ✅ Áudio deletado")

            if metadata.get('photo_url'):
                delete_file_from_storage(metadata['photo_url'])
                print(f"         ✅ Foto deletada")

            if metadata.get('video_url'):
                delete_file_from_storage(metadata['video_url'])
                print(f"         ✅ Vídeo deletado")

        return True
    else:
        print(f"       ❌ Erro ao atualizar: {response.text[:100]}")
        return False

def processar_categoria(pasta_categoria, status_alvo):
    """Processa uma categoria (aprovados ou rejeitados)"""
    print(f"\n{'='*60}")
    print(f"📂 {pasta_categoria.name.upper()}")
    print(f"{'='*60}")

    total = 0
    sucesso = 0

    # Iterar por tipos (sonhos, prospeccoes, etc)
    for pasta_tipo in pasta_categoria.iterdir():
        if not pasta_tipo.is_dir():
            continue

        tipo_nome = pasta_tipo.name
        print(f"\n  📁 {tipo_nome}")

        # Iterar por pastas individuais
        pastas_items = [p for p in pasta_tipo.iterdir() if p.is_dir()]

        if not pastas_items:
            print(f"    ✅ Nenhum item")
            continue

        for pasta_item in pastas_items:
            total += 1
            if processar_pasta(pasta_item, status_alvo):
                sucesso += 1

    return total, sucesso

def main():
    print("🔄 ATUALIZAR STATUS NO SUPABASE")
    print("="*60)

    total_geral = 0
    sucesso_geral = 0

    # Processar aprovados
    pasta_aprovados = BASE_DIR / 'aprovados'
    if pasta_aprovados.exists():
        total, sucesso = processar_categoria(pasta_aprovados, 'approved')
        total_geral += total
        sucesso_geral += sucesso

    # Processar rejeitados
    pasta_rejeitados = BASE_DIR / 'rejeitados'
    if pasta_rejeitados.exists():
        total, sucesso = processar_categoria(pasta_rejeitados, 'rejected')
        total_geral += total
        sucesso_geral += sucesso

    print("\n" + "="*60)
    print(f"✅ ATUALIZAÇÃO COMPLETA")
    print(f"{'='*60}")
    print(f"  Total processado: {total_geral}")
    print(f"  Sucesso: {sucesso_geral}")
    print(f"  Falhas: {total_geral - sucesso_geral}")
    print()

    if sucesso_geral > 0:
        print("📝 Próximos passos:")
        print("1. Verifique o status no painel admin ou Supabase")
        print("2. OPCIONAL: Mova pastas processadas para arquivo")
        print("3. Execute novamente: python3 baixar_pendentes.py")
        print()

if __name__ == '__main__':
    main()
