const fs = require('fs');

const leavesPage = 'frontend/src/app/(dashboard)/leaves/page.tsx';
let leavesContent = fs.readFileSync(leavesPage, 'utf8');

// Header
leavesContent = leavesContent.replace(
  /<th className="px-3 py-3 font-semibold text-right">Action<\/th>/g,
  '<th className="px-3 py-3 font-semibold text-left">Action</th>'
);

// Cell
leavesContent = leavesContent.replace(
  /<td className="px-3 py-3 text-right break-words whitespace-normal leading-tight">/g,
  '<td className="px-3 py-3 text-left break-words whitespace-normal leading-tight">'
);

// Inner flex container inside Action column might have justify-end, though in leaves/page.tsx the cancel button was just in a flex div.
leavesContent = leavesContent.replace(
  /<div className="flex justify-end">/g, // Assuming there might be one
  '<div className="flex justify-start">'
);

fs.writeFileSync(leavesPage, leavesContent, 'utf8');
console.log('Fixed alignment in leaves/page.tsx');


const approvalsPage = 'frontend/src/app/(dashboard)/leaves/approvals/page.tsx';
let approvalsContent = fs.readFileSync(approvalsPage, 'utf8');

// Header
approvalsContent = approvalsContent.replace(
  /<th className="py-2.5 px-3 text-right">Actions<\/th>/g,
  '<th className="py-2.5 px-3 text-left">Actions</th>'
);

// Cell
approvalsContent = approvalsContent.replace(
  /<td className="py-2.5 px-3 align-middle text-right break-words whitespace-normal leading-tight">/g,
  '<td className="py-2.5 px-3 align-middle text-left break-words whitespace-normal leading-tight">'
);

// Inner flex container
approvalsContent = approvalsContent.replace(
  /<div className="flex items-center justify-end gap-1">/g,
  '<div className="flex items-center justify-start gap-1">'
);

fs.writeFileSync(approvalsPage, approvalsContent, 'utf8');
console.log('Fixed alignment in leaves/approvals/page.tsx');
