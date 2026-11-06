import fs from 'node:fs';
import path from 'node:path';
import MarkdownIt from 'markdown-it';
import GithubSlugger from 'github-slugger';

const parser=new MarkdownIt({html:true,linkify:false});
const within=(root,file)=>{const relative=path.relative(root,file);return !path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep);};

/** Check the actual shipped instructions, not only their source-tree copies.
 * No network requests, link execution or additional agent context is involved. */
export function inspectDocumentLinks(directory) {
  const root=fs.realpathSync.native(directory),documents=new Map();
  function scan(dir){
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const file=path.join(dir,entry.name);
      if(entry.isSymbolicLink())throw Error('Linked instruction tree: '+file);
      if(entry.isDirectory())scan(file);
      else if(entry.isFile()&&/\.md$/i.test(entry.name))documents.set(file,null);
    }
  }
  scan(root);
  const inlineText=tokens=>(tokens||[]).map(token=>token.children?inlineText(token.children):['text','code_inline','image'].includes(token.type)?token.content:'').join('');
  function read(file){
    const existing=documents.get(file);if(existing)return existing;
    const source=fs.readFileSync(file,'utf8').replace(/^(?:\uFEFF)?---\s*\r?\n[\s\S]*?\r?\n---(?:\s*\r?\n|$)/,match=>match.replace(/[^\r\n]/g,' '));
    const tokens=parser.parse(source,{}),headings=new Set(),links=[],slugger=new GithubSlugger();
    function visit(items,line=1){let at=line;for(let index=0;index<items.length;index++){
      const token=items[index];if(token.map)at=token.map[0]+1;
      if(token.type==='heading_open'&&items[index+1]?.type==='inline')headings.add(slugger.slug(inlineText(items[index+1].children)));
      if(token.type==='link_open'||token.type==='image')links.push({target:token.attrGet(token.type==='image'?'src':'href'),line:at});
      if(token.type==='html_inline'||token.type==='html_block'){
        for(const match of token.content.matchAll(/\b(?:id|name)\s*=\s*["']([^"']+)["']/g))headings.add(match[1]);
        for(const match of token.content.matchAll(/<(?:a|img)\b[^>]*\b(?:href|src)\s*=\s*["']([^"']+)["']/g))links.push({target:match[1],line:at});
      }
      if(token.children)visit(token.children,at);
    }}
    visit(tokens);const value={headings,links};documents.set(file,value);return value;
  }
  const issues=[];let count=0;
  for(const file of documents.keys())for(const link of read(file).links){
    const href=link.target||'';
    const localAbsolute=/^(?:file:|[a-z]:[\\/])/i.test(href);
    if((/^[a-z][a-z0-9+.-]*:/i.test(href)&&!localAbsolute)||href.startsWith('//'))continue;
    count++;
    const issue=reason=>issues.push({file:path.relative(root,file).replaceAll('\\','/'),line:link.line,target:href,reason});
    if(localAbsolute){issue('non-portable local path');continue;}
    let location,anchor;
    try {const split=href.indexOf('#');location=decodeURIComponent((split<0?href:href.slice(0,split)).split('?')[0]);anchor=split<0?'':decodeURIComponent(href.slice(split+1));}
    catch{issue('invalid encoded link');continue;}
    let target=location?path.resolve(location.startsWith('/')?root:path.dirname(file),location.replace(/^\//,'')):file;
    if(!within(root,target)){issue('outside package');continue;}
    try {target=fs.realpathSync.native(target);if(!within(root,target)){issue('outside package');continue;}}
    catch {issue('missing file');continue;}
    if(fs.statSync(target).isDirectory()){
      const readme=path.join(target,'README.md');
      if(fs.existsSync(readme))target=readme;
      else {if(anchor)issue('heading target is not a document');continue;}
    }
    if(anchor&&/\.md$/i.test(target)&&!read(target).headings.has(anchor))issue('missing heading');
  }
  return {files:documents.size,links:count,issues};
}
