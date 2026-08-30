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
let changed = 0;

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  let newContent = content;
  
  // Find cases where a div with overflow-hidden wraps a table, and add overflow-x-auto
  // Note: This regex looks for className strings containing overflow-hidden
  // followed by a > and then possibly whitespace and then <table
  
  newContent = newContent.replace(/(<div[^>]*className=["'][^"']*)overflow-hidden([^"']*["'][^>]*>\s*<table)/g, (match, p1, p2) => {
    if (match.includes('overflow-x-auto')) {
      return match;
    }
    return p1 + 'overflow-hidden overflow-x-auto' + p2;
  });

  if (content !== newContent) {
    fs.writeFileSync(f, newContent, 'utf8');
    console.log('Added overflow-x-auto to: ' + f);
    changed++;
  }
});

console.log('Total files where overflow-x-auto was added: ' + changed);
