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
  // Replace whitespace-nowrap with break-words whitespace-normal leading-tight on td and th tags
  // We'll target `<td ` or `<th ` followed by className
  // Using a regex to find className="... whitespace-nowrap ..." inside td/th tags
  const newContent = content.replace(/(<t[dh][^>]*className=["'][^"']*)whitespace-nowrap([^"']*["'])/g, '$1break-words whitespace-normal leading-tight$2');
  
  if (content !== newContent) {
    fs.writeFileSync(f, newContent, 'utf8');
    console.log('Updated: ' + f);
    changedFiles++;
  }
});

console.log('Total files changed: ' + changedFiles);
