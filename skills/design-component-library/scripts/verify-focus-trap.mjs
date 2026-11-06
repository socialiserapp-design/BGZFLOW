// Adapted browser probe; see SOURCES.md and UPSTREAM-LICENSE.
import {requireTargets} from './_targets.mjs';
import {runProbe} from './_browser.mjs';
async function main() {
const argv = process.argv.slice(2);
const [file] = requireTargets(argv.filter(a => !a.startsWith('--')), { allowDirs: false });
const open = (argv.find(a => a.startsWith('--open=')) || '').slice(7);
/* A native <dialog> opened with showModal() IS a modal dialog: the role and the
   modal semantics are implicit, and the browser traps focus itself. Looking only
   for [role="dialog"] made the gate refuse the better implementation. */
const dialogSel = (argv.find(a => a.startsWith('--dialog=')) || '').slice(9)
  || '[role="dialog"],dialog[open]';
const dark = argv.includes('--dark');
/* No trigger means nothing was opened and nothing was measured. That exited 0,
   and run through gate.mjs it left a passing receipt for the page, which cleared
   the Stop hook for a page no gate had looked at (2026-10-20). Exit 2 is this
   repo's "I could not look". */
if (!file || !open) {
  console.log('verify_focustrap: no --open=<trigger> given, so no dialog was opened and nothing was measured.');
  console.log('usage: node scripts/verify-focus-trap.mjs <test-url-or-file> --open=<trigger> [--dialog=<sel>] [--dark]');
  process.exitCode=2; return;
}


await runProbe(async browser => {
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
await page.goto(file, { waitUntil: 'domcontentloaded', timeout: 15000 });
if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));

const fails = [];
const trigger = await page.locator(open).elementHandle();
await page.click(open).catch(() => fails.push(`could not click trigger ${open}`));
await page.waitForTimeout(120);

const sem = await page.evaluate(sel => {
  const d = [...document.querySelectorAll(sel)].find(el => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && (el.offsetParent !== null || cs.position === 'fixed'); });
  if (!d) return { open: false };
  const focusables = [...d.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(e => e.offsetParent !== null);
  const native = d.tagName === 'DIALOG' && d.hasAttribute('open');
  return { open: true,
    role: d.getAttribute('role') || (native ? 'dialog' : null),
    modal: d.getAttribute('aria-modal') || (native && typeof d.showModal === 'function' ? 'true' : null),
    native,
    named: !!(d.getAttribute('aria-label') || d.getAttribute('aria-labelledby')), count: focusables.length };
}, dialogSel);

if (!sem.open) {
  console.log(`verify_focustrap: no visible dialog (${dialogSel}) opened by ${open}: cannot verify`);
   process.exitCode=1; return;
}
if (sem.role !== 'dialog') fails.push(`dialog missing role="dialog" (got ${sem.role})`);
if (sem.modal !== 'true') fails.push(`dialog missing aria-modal="true" (got ${sem.modal})`);
if (!sem.named) fails.push('dialog has no accessible name (aria-label/aria-labelledby)');

// Tab through more times than there are focusables; focus must never leave the dialog.
const steps = Math.max(6, sem.count * 2 + 2);
let leaked = false, leakWhere = '';
for (let i = 0; i < steps; i++) {
  await page.keyboard.press('Tab');
  const inside = await page.evaluate(sel => {
    const d = [...document.querySelectorAll(sel)].find(el => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && (el.offsetParent !== null || cs.position === 'fixed'); });
    if (!d) return false;
    const a = document.activeElement;
    /* A native modal <dialog> parks focus on <body> for one step as it wraps from
       the last control back to the first. Focus is still inside the trap - it has
       not reached anything behind the dialog - and WCAG 2.4.3 is about reaching
       the page underneath. A leak is an INTERACTIVE element outside the dialog. */
    if (a === document.body || a === document.documentElement) return true;
    return d.contains(a);
  }, dialogSel);
  if (!inside) { leaked = true; leakWhere = `after ${i + 1} Tab(s)`; break; }
}
if (leaked) fails.push(`focus ESCAPED the dialog ${leakWhere}: keyboard trap leak (WCAG 2.4.3)`);

// Escape closes + returns focus to trigger
await page.keyboard.press('Escape');
await page.waitForTimeout(120);
const afterEsc = await page.evaluate(({ sel, trigger }) => {
  const d = [...document.querySelectorAll(sel)].find(el => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && (el.offsetParent !== null || cs.position === 'fixed'); });
  return { stillOpen: !!d, focusBackOnTrigger: trigger ? document.activeElement === trigger : null };
}, { sel: dialogSel, trigger });
if (afterEsc.stillOpen) fails.push('Escape did not close the dialog');
else if (afterEsc.focusBackOnTrigger === false) fails.push('focus not returned to the trigger after close (WCAG 2.4.3)');


const mode = dark ? ' [dark]' : '';
console.log(`focus-trap: authorised target${mode} (dialog had ${sem.count} focusables)`);
if (fails.length) { console.log('\nFAIL:'); for (const f of fails) console.log('  x ' + f); process.exitCode=1; return; }
console.log('OK: role/aria-modal/name present, Tab stays trapped, Escape closes and returns focus.');
process.exitCode=0;

});

}
try { await main(); } catch { console.error("Invalid or unavailable test target; nothing measured."); process.exitCode=2; }
