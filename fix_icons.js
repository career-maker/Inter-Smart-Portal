const fs = require('fs');

const approvalsPage = 'frontend/src/app/(dashboard)/leaves/approvals/page.tsx';
let approvalsContent = fs.readFileSync(approvalsPage, 'utf8');

// Replace Approve button in leaves
approvalsContent = approvalsContent.replace(
  /<button\s+onClick=\{\(\) => approve\("leave", req\.id\)\}\s+disabled=\{actionLoading\}\s+className="inline-flex items-center gap-0\.5 px-2 py-1 rounded-md text-\[11px\] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-50 cursor-pointer"\s*>\s*<Check className="w-3 h-3" \/> Approve\s*<\/button>/g,
  `<button
                                onClick={() => approve("leave", req.id)}
                                disabled={actionLoading}
                                title="Approve"
                                className="p-1.5 rounded-md text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center"
                              >
                                <Check className="w-4 h-4" />
                              </button>`
);

// Replace Reject button in leaves
approvalsContent = approvalsContent.replace(
  /<button\s+onClick=\{\(\) => \{\s+setRejectDialog\(\{ type: "leave", id: req\.id \}\);\s+setRejectReason\(""\);\s+\}\}\s+disabled=\{actionLoading\}\s+className="inline-flex items-center gap-0\.5 px-2 py-1 rounded-md text-\[11px\] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950\/60 dark:hover:bg-rose-900\/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 transition-colors disabled:opacity-50 cursor-pointer"\s*>\s*<XCircle className="w-3 h-3 text-rose-500" \/> Reject\s*<\/button>/g,
  `<button
                                onClick={() => {
                                  setRejectDialog({ type: "leave", id: req.id });
                                  setRejectReason("");
                                }}
                                disabled={actionLoading}
                                title="Reject"
                                className="p-1.5 rounded-md text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center"
                              >
                                <XCircle className="w-4 h-4 text-rose-500" />
                              </button>`
);

// Replace Cancel button in leaves
approvalsContent = approvalsContent.replace(
  /<button\s+onClick=\{\(\) => cancelRequest\("leave", req\.id\)\}\s+disabled=\{actionLoading\}\s+className="inline-flex items-center gap-0\.5 px-2 py-1 rounded-md text-\[11px\] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"\s+title="Cancel on behalf of employee"\s*>\s*<Trash2 className="w-3 h-3 text-slate-500" \/> Cancel\s*<\/button>/g,
  `<button
                                onClick={() => cancelRequest("leave", req.id)}
                                disabled={actionLoading}
                                title="Cancel Request (Delete)"
                                className="p-1.5 rounded-md text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center"
                              >
                                <Trash2 className="w-4 h-4 text-slate-500" />
                              </button>`
);


// Replace Approve button in WFH
approvalsContent = approvalsContent.replace(
  /<button\s+onClick=\{\(\) => approve\("wfh", req\.id\)\}\s+disabled=\{actionLoading\}\s+className="inline-flex items-center gap-0\.5 px-2 py-1 rounded-md text-\[11px\] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-50 cursor-pointer"\s*>\s*<Check className="w-3 h-3" \/> Approve\s*<\/button>/g,
  `<button
                                onClick={() => approve("wfh", req.id)}
                                disabled={actionLoading}
                                title="Approve"
                                className="p-1.5 rounded-md text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center"
                              >
                                <Check className="w-4 h-4" />
                              </button>`
);

// Replace Reject button in WFH
approvalsContent = approvalsContent.replace(
  /<button\s+onClick=\{\(\) => \{\s+setRejectDialog\(\{ type: "wfh", id: req\.id \}\);\s+setRejectReason\(""\);\s+\}\}\s+disabled=\{actionLoading\}\s+className="inline-flex items-center gap-0\.5 px-2 py-1 rounded-md text-\[11px\] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950\/60 dark:hover:bg-rose-900\/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 transition-colors disabled:opacity-50 cursor-pointer"\s*>\s*<XCircle className="w-3 h-3 text-rose-500" \/> Reject\s*<\/button>/g,
  `<button
                                onClick={() => {
                                  setRejectDialog({ type: "wfh", id: req.id });
                                  setRejectReason("");
                                }}
                                disabled={actionLoading}
                                title="Reject"
                                className="p-1.5 rounded-md text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center"
                              >
                                <XCircle className="w-4 h-4 text-rose-500" />
                              </button>`
);


fs.writeFileSync(approvalsPage, approvalsContent, 'utf8');
console.log('Fixed buttons in leaves/approvals/page.tsx');

const leavesPage = 'frontend/src/app/(dashboard)/leaves/page.tsx';
let leavesContent = fs.readFileSync(leavesPage, 'utf8');

leavesContent = leavesContent.replace(
  /<button\s+type="button"\s+onClick=\{\(\) => handleCancelLeave\(req\.id\)\}\s+disabled=\{cancellingId === req\.id\}\s+className="inline-flex items-center gap-1 px-2\.5 py-1 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950\/60 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer disabled:opacity-50"\s*>\s*<X className="w-3\.5 h-3\.5" \/>\s*<span>\{cancellingId === req\.id \? "Cancelling…" : "Cancel"\}<\/span>\s*<\/button>/g,
  `<button
                          type="button"
                          onClick={() => handleCancelLeave(req.id)}
                          disabled={cancellingId === req.id}
                          title={cancellingId === req.id ? "Cancelling..." : "Cancel"}
                          className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>`
);

fs.writeFileSync(leavesPage, leavesContent, 'utf8');
console.log('Fixed buttons in leaves/page.tsx');
