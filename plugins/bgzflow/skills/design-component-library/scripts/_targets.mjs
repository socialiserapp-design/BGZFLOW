// Adapted from upstream requireTargets; see SOURCES.md and UPSTREAM-LICENSE.
import {statSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
export function requireTargets(targets) {
 if(targets.length!==1)throw Error('One explicit authorised test target is required.');
 const target=targets[0];
 if(/^https?:\/\//i.test(target)){
  const url=new URL(target);if(url.username||url.password)throw Error('Do not put credentials in test URLs.');
  return [url.href];
 }
 if(/^[a-z][a-z0-9+.-]*:/i.test(target)&&! /^[a-z]:[\\/]/i.test(target))throw Error('Use an HTTP test URL or an existing HTML file.');
 const file=resolve(target);if(!statSync(file).isFile())throw Error('The test HTML file is unavailable.');
 return [pathToFileURL(file).href];
}
