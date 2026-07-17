import os
import re

def walk_files(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts') or file.endswith('.jsx'):
                yield os.path.join(root, file)

def fix_classes(classes_string):
    classes = classes_string.split()
    new_classes = []
    
    leading_space = " " if classes_string.startswith(" ") else ""
    trailing_space = " " if classes_string.endswith(" ") else ""
    
    has_colored_bg = any(c.startswith('bg-') and not c.startswith('bg-slate') and not c.startswith('bg-white') and not c.startswith('bg-black') and not c.startswith('bg-transparent') for c in classes)
    
    for c in classes:
        if 'dark:' in c:
            new_classes.append(c)
            continue
            
        if c == 'bg-slate-900' or c == 'bg-[#0f172a]' or c == 'bg-[#0F172A]':
            new_classes.append(f'bg-slate-50 dark:{c}')
        elif c.startswith('bg-slate-900/'):
            opacity = c.split('/')[-1]
            new_classes.append(f'bg-slate-100/{opacity} dark:{c}')
        elif c == 'bg-slate-800' or c == 'bg-[#1e293b]' or c == 'bg-[#1E293B]':
            new_classes.append(f'bg-white dark:{c}')
        elif c.startswith('bg-slate-800/'):
            opacity = c.split('/')[-1]
            new_classes.append(f'bg-white/{opacity} dark:{c}')
        elif c == 'bg-slate-950':
            new_classes.append(f'bg-slate-100 dark:{c}')
            
        elif c.startswith('from-slate-900'):
            new_classes.append(c.replace('from-slate-900', 'from-slate-50') + f' dark:{c}')
        elif c.startswith('from-slate-800'):
            new_classes.append(c.replace('from-slate-800', 'from-white') + f' dark:{c}')
        elif c.startswith('to-slate-900'):
            new_classes.append(c.replace('to-slate-900', 'to-slate-50') + f' dark:{c}')
        elif c.startswith('to-slate-800'):
            new_classes.append(c.replace('to-slate-800', 'to-white') + f' dark:{c}')
            
        elif c == 'text-white' and not has_colored_bg:
            new_classes.append(f'text-slate-900 dark:{c}')
        elif c == 'text-slate-300':
            new_classes.append(f'text-slate-600 dark:{c}')
        elif c == 'text-slate-400':
            new_classes.append(f'text-slate-500 dark:{c}')
            
        elif c.startswith('border-white/'):
            new_classes.append(f'border-slate-200 dark:{c}')
        elif c.startswith('divide-white/'):
            new_classes.append(f'divide-slate-200 dark:{c}')
        elif c == 'border-slate-700':
            new_classes.append(f'border-slate-200 dark:{c}')
            
        elif c == 'hover:bg-white/5':
            new_classes.append(f'hover:bg-slate-100 dark:{c}')
        elif c == 'hover:bg-white/10':
            new_classes.append(f'hover:bg-slate-200 dark:{c}')
        elif c == 'hover:text-white' and not has_colored_bg:
            new_classes.append(f'hover:text-slate-900 dark:{c}')
            
        else:
            new_classes.append(c)
            
    seen = set()
    deduped = []
    for nc in new_classes:
        if nc not in seen:
            seen.add(nc)
            deduped.append(nc)
            
    return leading_space + ' '.join(deduped) + trailing_space

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = re.sub(r'className="([^"]+)"', lambda m: f'className="{fix_classes(m.group(1))}"', content)
    
    def replace_backticks(m):
        inner = m.group(1)
        parts = re.split(r'(\$\{[^\}]+\})', inner)
        new_parts = []
        for p in parts:
            if p.startswith('${'):
                new_parts.append(p)
            else:
                new_parts.append(fix_classes(p))
        return f'className={{`{"".join(new_parts)}`}}'
        
    new_content = re.sub(r'className=\{`([^`]+)`\}', replace_backticks, new_content)
    new_content = re.sub(r"className='([^']+)'", lambda m: f"className='{fix_classes(m.group(1))}'", new_content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

if __name__ == '__main__':
    modified = 0
    dirs_to_check = ['frontend/src/app', 'frontend/src/components']
    for d in dirs_to_check:
        for f in walk_files(d):
            if process_file(f):
                modified += 1
    print(f"Modified {modified} files")
