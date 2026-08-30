const fs = require('fs');

const leavesPage = 'frontend/src/app/(dashboard)/leaves/page.tsx';
let leavesContent = fs.readFileSync(leavesPage, 'utf8');

// Header
leavesContent = leavesContent.replace(
  /<th className="px-3 py-3 font-semibold text-left">Action<\/th>/g,
  '<th className="px-3 py-3 font-semibold text-center">Action</th>'
);

// Cell
leavesContent = leavesContent.replace(
  /<td className="px-3 py-3 text-left break-words whitespace-normal leading-tight">/g,
  '<td className="px-3 py-3 text-center break-words whitespace-normal leading-tight">'
);

// Inner flex container
leavesContent = leavesContent.replace(
  /<div className="flex justify-start">/g,
  '<div className="flex justify-center">'
);

// Revert Cancel button in leaves to text
leavesContent = leavesContent.replace(
  /<button\s+type="button"\s+onClick=\{\(\) => handleCancelLeave\(req\.id\)\}\s+disabled=\{cancellingId === req\.id\}\s+title=\{cancellingId === req\.id \? "Cancelling\.\.\." : "Cancel"\}\s+className="p-1\.5 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950\/60 dark:hover:bg-rose-900\/60 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center"\s*>\s*<X className="w-4 h-4" \/>\s*<\/button>/g,
  `<button
                          type="button"
                          onClick={() => handleCancelLeave(req.id)}
                          disabled={cancellingId === req.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer disabled:opacity-50 mx-auto"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>{cancellingId === req.id ? "Cancelling…" : "Cancel"}</span>
                        </button>`
);

fs.writeFileSync(leavesPage, leavesContent, 'utf8');
console.log('Fixed alignment and button in leaves/page.tsx');


const approvalsPage = 'frontend/src/app/(dashboard)/leaves/approvals/page.tsx';
let approvalsContent = fs.readFileSync(approvalsPage, 'utf8');

// Header
approvalsContent = approvalsContent.replace(
  /<th className="py-2.5 px-3 text-left">Actions<\/th>/g,
  '<th className="py-2.5 px-3 text-center">Actions</th>'
);

// Cell
approvalsContent = approvalsContent.replace(
  /<td className="py-2.5 px-3 align-middle text-left break-words whitespace-normal leading-tight">/g,
  '<td className="py-2.5 px-3 align-middle text-center break-words whitespace-normal leading-tight">'
);

// Inner flex container
approvalsContent = approvalsContent.replace(
  /<div className="flex items-center justify-start gap-1">/g,
  '<div className="flex items-center justify-center gap-1">'
);

fs.writeFileSync(approvalsPage, approvalsContent, 'utf8');
console.log('Fixed alignment in leaves/approvals/page.tsx');
