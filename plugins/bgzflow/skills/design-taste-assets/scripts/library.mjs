import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const json=relative=>JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
const inside=(parent,file)=>{const rel=path.relative(parent,file);return rel!==''&&!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel);};
const link=stat=>stat.isSymbolicLink()||Boolean((stat.fileAttributes||0)&0x400);
function safePath(file){let cursor=path.parse(path.resolve(file)).root;for(const part of path.relative(cursor,path.resolve(file)).split(path.sep)){cursor=path.join(cursor,part);if(fs.existsSync(cursor)&&link(fs.lstatSync(cursor)))throw Error('Linked paths are not admitted.');}}

/** Read metadata only. Source style ratings, trade bans and quotas are not filters. */
export function listAssets({family,query=''}={}){
  const manifest=json('source-manifest.json'),files=manifest.files.filter(item=>item.path.startsWith('assets/'));
  const records=[];
  for(const group of ['components','effects','moments','scenes','objects','ui','layout','diagrams','backgrounds','motion']){
    const folders=new Set(files.map(item=>item.path.split('/')).filter(parts=>parts[1]===group&&parts.length>3).map(parts=>parts[2]));
    for(const id of folders){if(id.startsWith('_')||id==='img')continue;const base=`assets/${group}/${id}/`,members=files.filter(item=>item.path.startsWith(base));let meta={};try{meta=json(base+'meta.json');}catch{}
      records.push({id:`${group}/${id}`,family:group,name:meta.name||id,description:meta.for||meta.description||meta.look||meta.how||'',files:members.map(item=>item.path),rights:'Repository MIT unless asset-specific attribution applies. Example content is not product truth.'});
    }
  }
  const iconIndex=json('assets/icons/index.json');
  const knownFiles=new Set(files.map(item=>item.path));
  const localFiles=items=>[...new Set(items)].filter(file=>knownFiles.has(file));
  const exampleNote='Reusable source example; original business-type bans, quotas and style defaults are not selection rules. Full export preserves dynamic dependency families.';
  for(const ground of json('assets/backgrounds/index.json').grounds){records.push({id:`backgrounds/${ground.id}`,family:'backgrounds',name:ground.name||ground.id,description:[ground.mood,ground.where,(ground.roles||[]).join(' ')].filter(Boolean).join(' '),className:ground.class,files:localFiles(['assets/backgrounds/index.json','assets/backgrounds/backgrounds.css','assets/backgrounds/backgrounds.js','assets/system.css']),note:exampleNote});}
  const motion=json('assets/motion/meta.json');
  records.push({id:`motion/${motion.name}`,family:'motion',name:motion.title||motion.name,description:motion.shows||'',files:localFiles(['assets/motion/meta.json',...Object.keys(motion.files||{}).map(file=>'assets/motion/'+file),...(motion.requires||[])]),note:exampleNote});
  const iconSource=id=>{
    const direct='assets/icons/demo/'+id.replace(':','-')+'.svg';if(knownFiles.has(direct))return direct;
    const named=[...iconIndex.apps,...iconIndex.files].find(item=>item.icon===id||item.id===id);return named?'assets/icons/demo/'+named.id+'.svg':null;
  };
  const presetIcons=value=>{if(!value||typeof value!=='object')return [];return Object.entries(value).flatMap(([key,item])=>key==='icon'&&typeof item==='string'?[iconSource(item)].filter(Boolean):typeof item==='object'?presetIcons(item):[]);};
  for(const [id,preset] of Object.entries(json('assets/diagrams/presets.json').presets))records.push({id:`diagrams/${id}`,family:'diagrams',name:id,description:preset.alt||preset.description||`${preset.layout||''} diagram`,files:localFiles(['assets/diagrams/presets.json','assets/diagrams/diagram.js','assets/diagrams/mount.js','assets/diagrams/diagram.css','assets/icons/icon.css',...presetIcons(preset)]),integration:'For bundled SVGs set data-icon-base="assets/icons/demo/" or the equivalent iconBase option; retain actual mark credits. Replace illustrative labels/integrations with supplied truth.',note:exampleNote});
  for(const hero of json('assets/layout/heroes.json').heroes)records.push({id:`layout/${hero.id}`,family:'layout',name:hero.name||hero.id,description:`${hero.id} hero composition example. ${hero.job||''}`,files:localFiles(['assets/layout/heroes.json','assets/layout/'+(hero.demo||`hero-${hero.id}.html`),'assets/layout/layout.css','assets/layout/layout.js','assets/system.css','assets/system.js','assets/ui/ui.js','assets/ui/base.css','assets/ui/cards.css']),note:exampleNote});
  const icons=[...iconIndex.apps,...iconIndex.files,...iconIndex.ui.map(item=>({...item,id:'ui-'+item.id,icon:'ui:'+item.id}))];
  for(const item of files.filter(item=>/^assets\/icons\/demo\/[^/]+\.svg$/.test(item.path))){const id=path.basename(item.path,'.svg'),metadata=icons.find(icon=>icon.id===id);records.push({id:`icons/${id}`,family:'icons',name:metadata?.name||id,description:(metadata?.tags||[]).join(' '),files:[item.path],icon:metadata?.icon||null,rights:'See THIRD_PARTY_NOTICES.md and assets/icons/index.json; brand marks remain trademarks.'});}
  for(const photo of json('assets/photos/photos.json').photos){const local=(photo.files||[]).map(item=>'assets/photos/'+item.file).filter(file=>files.some(item=>item.path===file));records.push({id:`photos/${photo.id}`,family:'photos',name:photo.alt||photo.id,description:photo.subject||'',files:local,available:local.length>0,rights:{author:photo.by,license:photo.licence,licenseUrl:photo.licenceUrl,source:photo.page},note:local.length?'Library/stock image, not a claim about a client.':'Metadata only; no automatic remote download.'});}
  for(const [group,file] of [['palettes','palettes.json'],['type','type.json']])for(const item of json('library/'+file)){records.push({id:`${group}/${item.id}`,family:group,name:item.name||item.id,description:item.description||item.note||item.suits||'',tags:item.tags||item.moods||[],proposal:item,files:['library/'+file],rights:'Palette/font pairing proposal only; font binaries are not bundled and have separate rights.'});}
  const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return records.filter(item=>(!family||item.family===family)&&terms.every(term=>`${item.id} ${item.name} ${item.description} ${(item.tags||[]).join(' ')}`.toLowerCase().includes(term)));
}

export function verifyIntegrity(base=root){
  const manifest=JSON.parse(fs.readFileSync(path.join(base,'source-manifest.json'),'utf8'));
  const problems=[];for(const item of manifest.files){const file=path.resolve(base,item.path);try{if(path.isAbsolute(item.path)||!inside(base,file))throw Error('Escaping source path.');safePath(file);const stat=fs.lstatSync(file);if(!stat.isFile()||stat.nlink>1)throw Error('Not an owned regular file.');const data=fs.readFileSync(file);if(data.length!==item.bytes||createHash('sha256').update(data).digest('hex')!==item.sha256)problems.push(item.path);}catch{problems.push(item.path);}}
  return {pass:problems.length===0,problems};
}

/** Full runtime closure export. No setup, network, browser, overwrite or cleanup. */
export function exportLibrary(output){
  output=path.resolve(output);if(inside(root,output)||output===root)throw Error('Export outside the source library.');safePath(output);if(fs.existsSync(output))throw Error('Choose a new export directory; existing content is never overwritten.');
  const integrity=verifyIntegrity();if(!integrity.pass)throw Error('Source integrity check failed.');fs.mkdirSync(output,{recursive:true});
  for(const name of ['assets','library','LICENSE','LICENSES','THIRD_PARTY_NOTICES.md','asset-rights.json'])fs.cpSync(path.join(root,name),path.join(output,name),{recursive:true,errorOnExist:true,force:false,dereference:false});
  const files=json('source-manifest.json').files.filter(item=>item.path.startsWith('assets/')||item.path.startsWith('library/')).map(({path,bytes,sha256})=>({path,bytes,sha256}));
  fs.writeFileSync(path.join(output,'taste-export.json'),JSON.stringify({repository:json('source-manifest.json').repository,revision:json('source-manifest.json').revision,files,note:'Complete browser/runtime closure, not a ready-made approved page. No code has been executed.'},null,2),{flag:'wx'});
  return {output,files:files.length,bytes:files.reduce((sum,item)=>sum+item.bytes,0)};
}

export function run(args){
  const [command,...rest]=args,opt=name=>{const i=rest.indexOf(name);return i>=0?rest[i+1]:undefined;};
  if(command==='list'){
    const records=listAssets({family:opt('--family'),query:opt('--query')||''}).filter(item=>!rest.includes('--local')||item.files.length>0);const offset=Number(opt('--offset')||0),limit=Number(opt('--limit')||20);
    if(!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1)throw Error('Use positive --limit and nonnegative --offset integers.');
    return {total:records.length,offset,items:records.slice(offset,offset+limit).map(({proposal,...item})=>item),nextOffset:offset+limit<records.length?offset+limit:null,note:'Metadata excerpt only. Use --offset/--limit to request more; source-manifest stays on disk.'};
  }
  if(command==='show'){const record=listAssets().find(item=>item.id===rest[0]);if(!record)throw Error('Unknown asset ID.');return record;}
  if(command==='verify')return verifyIntegrity();
  if(command==='export'&&opt('--out'))return exportLibrary(opt('--out'));
  throw Error('Use list [--family <family>] [--query <words>], show <family/id>, verify, or export --out <new directory>.');
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){try{console.log(JSON.stringify(run(process.argv.slice(2)),null,2));}catch(error){console.error(error.message);process.exitCode=1;}}
