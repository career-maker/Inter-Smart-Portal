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
  
  // Replace px-6 py-4 with px-3 py-3 in td tags
  newContent = newContent.replace(/(<td[^>]*className=["'][^"']*)px-6 py-4([^"']*["'])/g, '$1px-3 py-3$2');
  newContent = newContent.replace(/(<td[^>]*className=["'][^"']*)px-6 py-3([^"']*["'])/g, '$1px-3 py-3$2');
  newContent = newContent.replace(/(<td[^>]*className=["'][^"']*)px-4 py-3([^"']*["'])/g, '$1px-3 py-3$2'); // Reports has px-4 py-3

  // Replace px-6 py-3 with px-3 py-3 in th tags
  newContent = newContent.replace(/(<th[^>]*className=["'][^"']*)px-6 py-3([^"']*["'])/g, '$1px-3 py-3$2');
  newContent = newContent.replace(/(<th[^>]*className=["'][^"']*)px-6 py-4([^"']*["'])/g, '$1px-3 py-3$2');
  newContent = newContent.replace(/(<th[^>]*className=["'][^"']*)px-4 py-3([^"']*["'])/g, '$1px-3 py-3$2');
  
  if (content !== newContent) {
    fs.writeFileSync(f, newContent, 'utf8');
    console.log('Updated padding in: ' + f);
    changedFiles++;
  }
});

console.log('Total files padding adjusted: ' + changedFiles);
