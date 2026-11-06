// Adapted browser probe; see SOURCES.md and UPSTREAM-LICENSE.
import {requireTargets} from './_targets.mjs';
import {runProbe} from './_browser.mjs';
async function main() {
const [file] = requireTargets(process.argv.slice(2).filter(a => !a.startsWith('--')), { allowDirs: false });
if (!file) { console.log('usage: node scripts/verify-rtl.mjs <test-url-or-file>'); process.exitCode=0; }


await runProbe(async browser => {
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(file, { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });

const overflow = () => page.evaluate(() => {
  const de = document.documentElement;
  const x = de.scrollWidth - de.clientWidth;
  // elements wider than the viewport (the usual RTL breakage)
  const wide = [...document.body.querySelectorAll('*')].filter(el => {
    const r = el.getBoundingClientRect();
    return r.right > de.clientWidth + 2 || r.left < -2;
  }).slice(0, 5).map(el => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''));
  return { x: Math.max(0, x), wide };
});

const ltr = await overflow();
await page.evaluate(() => { document.documentElement.setAttribute('dir', 'rtl'); });
await page.waitForTimeout(120);
const rtl = await overflow();


console.log(`RTL: authorised target`);
console.log(`  LTR horizontal overflow: ${ltr.x}px | RTL: ${rtl.x}px`);
if (rtl.x > ltr.x + 2) {
  console.log(`\nFAIL: RTL introduces ${rtl.x - ltr.x}px of horizontal overflow not present in LTR.`);
  if (rtl.wide.length) console.log('  offending elements: ' + rtl.wide.join(', '));
  console.log('  → replace physical left/right with logical properties (margin-inline-*, inset-inline-*, text-align: start).');
  process.exitCode=1; return;
}
console.log('OK: layout mirrors cleanly, no RTL-only horizontal overflow.');
process.exitCode=0;

});

}
try { await main(); } catch { console.error("Invalid or unavailable test target; nothing measured."); process.exitCode=2; }
