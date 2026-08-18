import sys, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
with open(r'D:\iss\Inter Smart-Employee-Portal\database\migration\mysql\inter-smart-employee-portal-mysql.sql', encoding='utf-8') as f:
    text = f.read()

# Find INSERT for cache
pos = text.find('INSERT INTO `cache`')
if pos >= 0:
    seg = text[pos:pos+800]
    print('CACHE INSERT (first 800 chars):')
    print(repr(seg[:800]))
else:
    print('No cache INSERT found')
