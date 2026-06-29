import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Replace main shadows
    content = content.replace(
        'shadow-[6px_6px_12px_rgba(0,0,0,0.06),-6px_-6px_12px_rgba(255,235,100,0.9)]',
        'shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-2xl border border-white/60'
    )
    
    # Replace small shadows
    content = content.replace(
        'shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,235,100,0.9)]',
        'shadow-[0_4px_20px_rgba(0,0,0,0.05)] backdrop-blur-2xl border border-white/60'
    )
    
    # Replace hover inset shadows with a glow up
    content = content.replace(
        'hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.06),inset_-4px_-4px_8px_rgba(255,235,100,0.9)]',
        'hover:bg-white/40 hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)]'
    )
    
    content = content.replace(
        'hover:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.06),inset_-3px_-3px_6px_rgba(255,235,100,0.9)]',
        'hover:bg-white/40 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)]'
    )
    
    # Replace inset shadows on small icons (make them glass too)
    content = content.replace(
        'shadow-[inset_2px_2px_5px_rgba(0,0,0,0.05),inset_-2px_-2px_5px_rgba(255,235,100,0.9)]',
        'shadow-sm border border-white/50 backdrop-blur-md bg-white/50'
    )

    # Make background colors translucent for glass effect
    # find bg-blue-50, bg-pink-50 etc. and add /60
    # Wait, some are dynamically generated: bgColor = color.replace('bg-', 'bg-').replace('-500', '-50/60');
    content = re.sub(r'bg-([a-z]+)-50(?!/)', r'bg-\1-50/70', content)
    
    # Fix the dynamic background in KPICard
    content = content.replace(
        "const bgColor = color.replace('bg-', 'bg-').replace('-500', '-50');",
        "const bgColor = color.replace('bg-', 'bg-').replace('-500', '-50/70');"
    )

    with open(filepath, 'w') as f:
        f.write(content)

process_file('d:/iss/Inter Smart-Employee-Portal/frontend/src/app/(dashboard)/dashboard/page.tsx')
process_file('d:/iss/Inter Smart-Employee-Portal/frontend/src/app/(dashboard)/activities/page.tsx')

print("Glassmorphism applied!")
