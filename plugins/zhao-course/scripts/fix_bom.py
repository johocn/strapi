import os
import json

plugins = ['zhao-channel', 'zhao-auth', 'zhao-common', 'zhao-third', 'zhao-course']
log = []

for p in plugins:
    path = os.path.join('E:/code/plugins', p, 'package.json')
    if not os.path.exists(path):
        log.append(f'{p}: FILE NOT FOUND')
        continue
    
    with open(path, 'rb') as f:
        data = f.read()
    
    has_bom = data[:3] == b'\xef\xbb\xbf'
    if has_bom:
        content = data[3:].decode('utf-8')
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        log.append(f'{p}: BOM FIXED')
    else:
        content = data.decode('utf-8')
        try:
            json.loads(content)
            log.append(f'{p}: OK (BOM=False)')
        except json.JSONDecodeError as e:
            log.append(f'{p}: JSON_ERROR - {e}')
    
    # Show first few bytes
    with open(path, 'rb') as f:
        first3 = f.read(3)
    log.append(f'  -> First 3 bytes: {[hex(b) for b in first3]}')

msg = '\n'.join(log)
print(msg)
# Also write to a temp file
open(os.path.join('E:/code/plugins/zhao-course', 'fix_log.txt'), 'w').write(msg + '\nDONE')
print('DONE')
