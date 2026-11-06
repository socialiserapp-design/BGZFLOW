import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {listAssets,run,verifyIntegrity,exportLibrary} from '../../skills/design-taste-assets/scripts/library.mjs';
import {color} from '../../skills/design-taste-assets/assets/effects/fx.js';
import {glslProblems} from '../../skills/design-taste-assets/assets/objects/_print-core/print3d.js';
const root=fileURLToPath(new URL('../../skills/design-taste-assets/',import.meta.url));
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
function temp(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bgz-taste-import-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}

test('complete pinned source capture is intact; browser tools and policy remain inspection material',()=>{
  const manifest=JSON.parse(read('source-manifest.json'));assert.equal(manifest.files.length,1617);assert.ok(verifyIntegrity().pass);
  for(const item of manifest.files){if(item.source_path==='SKILL.md'||item.source_path.startsWith('scripts/')||item.source_path.endsWith('.mjs'))assert.match(item.path,/\.source\.txt$/);}
  assert.ok(fs.existsSync(path.join(root,'assets/components/shared.js')));assert.ok(fs.existsSync(path.join(root,'assets/effects/fx.js')));
});

test('bounded offline lookup returns actual component/effect/photo files, with explicit pagination and availability',()=>{
  const button=run(['show','components/fx-button']);assert.ok(button.files.includes('assets/components/fx-button/component.js'));assert.match(read(button.files.find(file=>file.endsWith('.js'))),/\.\.\/shared\.js/);
  const page=run(['list','--family','icons','--limit','3']);assert.equal(page.items.length,3);assert.ok(page.total>900);assert.equal(page.nextOffset,3);assert.notDeepEqual(run(['list','--family','icons','--limit','3','--offset','3']).items,page.items);
  assert.ok(listAssets({family:'effects',query:'grain'}).some(item=>item.id==='effects/grain-gradient'));
  const photos=listAssets({family:'photos'});assert.ok(photos.some(item=>item.available&&item.files.length));assert.ok(photos.some(item=>!item.available&&item.files.length===0));
  assert.ok(run(['list','--family','photos','--local']).items.every(item=>item.available));
  assert.throws(()=>run(['show','../../outside']),/Unknown/);assert.throws(()=>run(['list','--offset','-1']),/nonnegative/);
});

test('all advertised families expose real entries, including flat grounds, motion, diagram presets and hero layouts',()=>{
  for(const family of ['components','effects','moments','scenes','objects','ui','layout','diagrams','backgrounds','motion','icons','photos','palettes','type']){
    const entries=listAssets({family});assert.ok(entries.length>0,family);
    const local=entries.find(item=>item.files.length);assert.ok(local,family+' has a real local asset');
    for(const file of local.files)assert.ok(fs.statSync(path.join(root,file)).isFile(),file);
  }
  for(const [id,file,query] of [['backgrounds/mist','assets/backgrounds/backgrounds.css','mist'],['motion/motion','assets/motion/motion.js','focus'],['diagrams/hub-tools','assets/diagrams/diagram.js','gmail'],['layout/split','assets/layout/hero-split.html','split']]){
    const entry=run(['show',id]);assert.ok(entry.files.includes(file),id);assert.ok(listAssets({family:entry.family,query}).some(item=>item.id===id),query);
    for(const source of entry.files)assert.ok(fs.statSync(path.join(root,source)).isFile(),source);
  }
  const diagram=run(['show','diagrams/hub-tools']);assert.ok(diagram.files.includes('assets/icons/demo/gmail.svg'));assert.match(diagram.integration,/data-icon-base/);
});

test('metadata search uses actual palette tags and font suitability without filtering by a house style',()=>{
  assert.ok(listAssets({family:'type',query:'technical'}).some(item=>item.id==='type/geist'));
  assert.ok(listAssets({family:'palettes',query:'light-neutral'}).some(item=>item.id==='palettes/white-link-blue'));
  const page=run(['list','--family','type','--query','technical','--limit','1']);
  assert.equal(page.items.length,1);assert.ok(!Object.hasOwn(page.items[0],'proposal'));
});

test('actual imported CPU colour and shader validation code produces useful, falsifiable output',()=>{
  assert.equal(color.contrast('#000000','#ffffff'),21);assert.equal(color.hex([1,0,0]),'#ff0000');
  assert.equal(color.mix('#123456','#fedcba',0),'#123456');assert.equal(color.mix('#123456','#fedcba',1),'#fedcba');
  assert.deepEqual(glslProblems('float value = 1.0;'),[]);assert.ok(glslProblems('float texture = 1.0;').length>0);
});

test('every runtime JavaScript entry bundles with actual local shared dependencies; dynamic effects retain all modules',async()=>{
  const manifest=JSON.parse(read('source-manifest.json')),entries=manifest.files.filter(item=>item.path.startsWith('assets/')&&item.path.endsWith('.js')).map(item=>path.join(root,item.path));
  const bundled=await build({entryPoints:entries,bundle:true,platform:'browser',format:'esm',outdir:'unused-output',write:false,logLevel:'silent',metafile:true});
  assert.ok(Object.keys(bundled.metafile.inputs).some(file=>file.endsWith('components/shared.js')));assert.ok(Object.keys(bundled.metafile.inputs).some(file=>file.endsWith('effects/fx.js')));
  for(const item of listAssets({family:'effects'}))assert.ok(item.files.some(file=>file.endsWith('/effect.js')),item.id);
});

test('per-file rights distinguish third-party photographs/icons from repository MIT and retain share-alike versions',()=>{
  const rights=JSON.parse(read('asset-rights.json')),licenses=new Set(rights.assets.map(item=>item.license));
  for(const licence of ['CC BY-SA 3.0 AT','CC BY-SA 4.0','CC BY 2.0','CC0','Public Domain Mark 1.0','Unsplash License','ISC','MIT'])assert.ok(licenses.has(licence),licence);
  const manifest=JSON.parse(read('source-manifest.json'));for(const item of manifest.files.filter(item=>/^assets\/(?:photos\/img|layout\/img)\/.+\.(?:webp|jpg)$/.test(item.path)))assert.ok(rights.assets.some(record=>record.file===item.path&&record.author&&record.source&&record.licenseUrl),item.path);
  assert.match(read('LICENSES/lucide-ISC-and-Feather-MIT.txt'),/Cole Bemis/);
});

test('fresh export contains actual runtime closure, unmodified source bytes and credits; existing destinations are refused',t=>{
  const parent=temp(t),out=path.join(parent,'export'),result=exportLibrary(out);assert.ok(result.files>1500);
  for(const file of ['assets/components/fx-button/component.js','assets/components/shared.js','assets/effects/fx.js','assets/effects/grain-gradient/effect.js','assets/photos/photos.json','asset-rights.json','THIRD_PARTY_NOTICES.md','LICENSES/lucide-ISC-and-Feather-MIT.txt'])assert.equal(fs.readFileSync(path.join(out,file),'utf8'),read(file),file);
  assert.throws(()=>exportLibrary(out),/never overwritten/);assert.throws(()=>exportLibrary(path.join(root,'forbidden')),/outside/);
  const link=path.join(parent,'linked');fs.symlinkSync(out,link,process.platform==='win32'?'junction':'dir');assert.throws(()=>exportLibrary(path.join(link,'escape')),/Linked/);
});

test('integrity verifier detects changed bytes and escaping/linked manifest entries without reading an arbitrary library',t=>{
  const parent=temp(t),file=path.join(parent,'asset.js');fs.writeFileSync(file,'original');const record={path:'asset.js',bytes:8,sha256:createHash('sha256').update('original').digest('hex')};const manifest=()=>fs.writeFileSync(path.join(parent,'source-manifest.json'),JSON.stringify({files:[record]}));manifest();assert.equal(verifyIntegrity(parent).pass,true);
  fs.writeFileSync(file,'changed');assert.equal(verifyIntegrity(parent).pass,false);record.path='../outside';manifest();assert.equal(verifyIntegrity(parent).pass,false);
});
