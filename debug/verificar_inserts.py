#!/usr/bin/env python3
"""
Verifica se os inserts funcionaram usando service key
"""

import requests

SUPABASE_URL = 'https://nxanctcrqdcbbuhlktzb.supabase.co'
SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW5jdGNycWRjYmJ1aGxrdHpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM1NTE5MSwiZXhwIjoyMDg0OTMxMTkxfQ.qhEV8LIV4goJFzlUuK_rU6z1hXkT8wKqiWaNS5___mE'

headers = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}'
}

print("📊 Verificando dados com service key (admin view)\n")

for table in ['dreams', 'prospections', 'purges']:
    print(f"Tabela: {table}")

    # Contar total
    response = requests.get(
        f'{SUPABASE_URL}/rest/v1/{table}?select=count',
        headers=headers
    )
    if response.status_code == 200:
        count = response.json()[0].get('count', 0)
        print(f"  Total: {count} linhas")

    # Listar últimas 3
    response = requests.get(
        f'{SUPABASE_URL}/rest/v1/{table}?select=text,status,created_at&order=created_at.desc&limit=3',
        headers=headers
    )
    if response.status_code == 200:
        items = response.json()
        for item in items:
            text_preview = item.get('text', 'N/A')[:50] + '...' if len(item.get('text', '')) > 50 else item.get('text', 'N/A')
            print(f"    - {text_preview} (status: {item.get('status')})")

    print()

print("✅ Verificação completa!")
