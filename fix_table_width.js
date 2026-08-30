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
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('frontend/src/app/(dashboard)');
let changedFiles = 0;

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  let newContent = content;
  
  // Replace <table className="w-full ..."> with <table className="w-full min-w-[800px] ...">
  // We need to be careful not to replace it if it already has min-w-
  newContent = newContent.replace(/(<table\s+className=["']w-full\s+)(?!min-w-)([^"']*["'])/g, '$1min-w-[800px] $2');
  // Also handle cases where w-full is somewhere else in the className, but usually it's first
  // Let's just do a simpler replace that checks for <table and w-full but not min-w
  
  if (content !== newContent) {
    fs.writeFileSync(f, newContent, 'utf8');
    console.log('Added min-w-[800px] to: ' + f);
    changedFiles++;
  }
});

console.log('Total files table width adjusted: ' + changedFiles);
