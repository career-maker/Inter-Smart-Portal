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
let changedWidth = 0;

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  let newContent = content;
  
  // Replace min-w-[800px] with min-w-[1000px]
  newContent = newContent.replace(/min-w-\[800px\]/g, 'min-w-[1000px]');
  
  if (content !== newContent) {
    fs.writeFileSync(f, newContent, 'utf8');
    changedWidth++;
  }
});

console.log('Total files table width increased to 1000px: ' + changedWidth);

// Specific fixes for leaves/page.tsx
const leavesPage = 'frontend/src/app/(dashboard)/leaves/page.tsx';
let leavesContent = fs.readFileSync(leavesPage, 'utf8');

// Remove truncate from all headers
leavesContent = leavesContent.replace(/<th className="([^"]*) truncate">/g, '<th className="$1">');
// Remove max-w-[1px] truncate from Reason td
leavesContent = leavesContent.replace(/max-w-\[1px\] truncate/g, 'break-words whitespace-normal leading-tight');

// Adjust colgroup percentages to provide more space to Status and Action
leavesContent = leavesContent.replace(
  '<col className="w-[18%]" />\n                )}',
  '<col className="w-[20%]" />\n                )}'
);
leavesContent = leavesContent.replace('<col className="w-[12%]" />', '<col className="w-[12%]" />');
leavesContent = leavesContent.replace('<col className="w-[20%]" />', '<col className="w-[18%]" />');
leavesContent = leavesContent.replace('<col className="w-[6%]" />', '<col className="w-[8%]" />');
// Reason stays as <col className="" />
leavesContent = leavesContent.replace('<col className="w-[11%]" />', '<col className="w-[14%]" />'); // Status
leavesContent = leavesContent.replace('<col className="w-[10%]" />', '<col className="w-[14%]" />'); // Action

fs.writeFileSync(leavesPage, leavesContent, 'utf8');
console.log('Fixed specific truncation and colgroup bugs in leaves/page.tsx');

// Specific fixes for leaves/approvals/page.tsx
const approvalsPage = 'frontend/src/app/(dashboard)/leaves/approvals/page.tsx';
let approvalsContent = fs.readFileSync(approvalsPage, 'utf8');

// Leaves Table
approvalsContent = approvalsContent.replace(/<col className="w-\[18%\]" \/>\s*<col className="w-\[12%\]" \/>\s*<col className="w-\[16%\]" \/>\s*<col className="w-\[6%\]" \/>\s*<col className="w-\[10%\]" \/>\s*<col className="w-\[12%\]" \/>\s*\{\(statusFilter === "Pending" \|\| statusFilter === "All"\) && \(\s*<col className="w-\[26%\]" \/>/g, 
  '<col className="w-[16%]" />\n              <col className="w-[12%]" />\n              <col className="w-[14%]" />\n              <col className="w-[8%]" />\n              <col className="w-[14%]" />\n              <col className="w-[14%]" />\n              {(statusFilter === "Pending" || statusFilter === "All") && (\n                <col className="w-[22%]" />'
);

// WFH Table
approvalsContent = approvalsContent.replace(/<col className="w-\[18%\]" \/>\s*<col className="w-\[12%\]" \/>\s*<col className="w-\[16%\]" \/>\s*<col className="w-\[10%\]" \/>\s*<col className="w-\[10%\]" \/>\s*<col className="w-\[10%\]" \/>\s*\{\(statusFilter === "Pending" \|\| statusFilter === "All"\) && \(\s*<col className="w-\[24%\]" \/>/g,
  '<col className="w-[16%]" />\n              <col className="w-[12%]" />\n              <col className="w-[14%]" />\n              <col className="w-[10%]" />\n              <col className="w-[14%]" />\n              <col className="w-[12%]" />\n              {(statusFilter === "Pending" || statusFilter === "All") && (\n                <col className="w-[22%]" />'
);

fs.writeFileSync(approvalsPage, approvalsContent, 'utf8');
console.log('Fixed colgroup percentages in leaves/approvals/page.tsx');
