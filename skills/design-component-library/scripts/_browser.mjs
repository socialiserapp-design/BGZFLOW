import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
export async function existingPackage(name){
 try{return await import(name);}catch{}
 const require=createRequire(pathToFileURL(resolve(process.cwd(),'package.json')));
 return import(pathToFileURL(require.resolve(name)).href);
}
export async function openBrowser(){
 let chromium;try{({chromium}=await existingPackage('playwright'));}catch{throw Error('Existing Playwright is unavailable; nothing measured.');}
 return chromium.launch({channel:'chrome'}).catch(()=>chromium.launch());
}
export async function runProbe(work){
 let browser;
 try{browser=await openBrowser();await work(browser);}catch{console.error('Probe unavailable or interrupted; no successful observation established.');process.exitCode=2;}
 finally{if(browser)await browser.close().catch(()=>{});}
}
