const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('src/app/(dashboard)');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    
    // Replace <h1 className="..."> with text-white
    content = content.replace(/<h1\s+className="([^"]*?)"/g, (match, classes) => {
        // Remove existing text colors
        classes = classes.replace(/text-gray-\d+/g, '').replace(/text-slate-\d+/g, '').replace(/\s+/g, ' ').trim();
        if (!classes.includes('text-white')) {
            return `<h1 className="${classes} text-white"`;
        }
        return match;
    });

    // Replace <p className="..."> text-muted-foreground directly under h1 (often used as subtitle)
    // We can just find `<p className="text-muted-foreground"` and add `text-white/70` if it's near an h1.
    // Instead, let's just replace `text-muted-foreground` with `text-slate-300` in the file IF it looks like a page header.
    // Actually, replacing all `text-muted-foreground` with `text-white/70` might affect cards if they use it.
    // Let's specifically target the subtitle: <p className="text-muted-foreground"> or similar that follows the h1.
    content = content.replace(/<h1([\s\S]*?)<\/h1>\s*<p\s+className="([^"]*?)text-muted-foreground([^"]*?)"/g, 
        '<h1$1</h1>\n          <p className="$2text-slate-300$3"');

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed', file);
    }
});
