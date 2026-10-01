#!/usr/bin/env node
// Discovery, explicit approval and dated qualification only: no login, dispatch or network call.
import fs from 'node:fs';
import { discoverResources, saveApproval, saveProven, saveIdentities } from './lib.mjs';
import {refreshModelMaps} from './model-map.mjs';
import {resolveSwarmDir} from '../bg-swarm/lib.mjs';

const usage = 'usage: swarm-resources [--json] [--swarm <id>] [--approve <id1,id2,...> | --save-proven <proof.json>]';
try {
  const injectedNow = process.env.NODE_ENV === 'test' && process.env.BGZFLOW_TEST_NOW
    ? Date.parse(process.env.BGZFLOW_TEST_NOW)
    : Date.now();
  if (!Number.isFinite(injectedNow)) throw new Error('test clock is invalid');
  let json = false;
  let swarm = '';
  let approval;
  let proofFile;
  let observationFile;
  let help = false;
  let refresh=false,policyFile;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--json') json = true;
    else if(arg==='--refresh-models')refresh=true;
    else if(arg==='--policy'){policyFile=args[++i];if(!policyFile)throw new Error('--policy needs a nonsecret policy file');}
    else if (arg === '--help' || arg === '-h') help = true;
    else if (arg === '--swarm' || arg === '--approve' || arg === '--save-proven' || arg === '--observe') {
      const value = args[++i];
      if (!value || value.startsWith('-')) throw new Error(`${arg} needs a value`);
      if (arg === '--swarm') swarm = value;
      else if (arg === '--approve') approval = value.split(',').map((s) => s.trim()).filter(Boolean);
      else if (arg === '--observe') observationFile = value;
      else proofFile = value;
    } else throw new Error('unknown argument');
  }
  if (help) console.log(usage);
  else {
    if (approval !== undefined && proofFile) throw new Error('save approval and qualification separately');
    if (observationFile) {
      if (/(?:auth\.json|credentials|\.env(?:\.|$))/i.test(observationFile)) throw new Error('use a nonsecret status export, never credentials');
      saveIdentities(JSON.parse(fs.readFileSync(observationFile, 'utf8')), { now: injectedNow });
    }
    let result = discoverResources({ swarm, now: injectedNow });
    if(refresh){if(!policyFile||/(?:auth\.json|credentials|\.env(?:\.|$))/i.test(policyFile))throw new Error('--refresh-models needs --policy with model and route settings only');result.modelMap=refreshModelMaps(result.resources,JSON.parse(fs.readFileSync(policyFile,'utf8')),{dir:resolveSwarmDir()});}
    if (proofFile) {
      let proof;
      try { proof = JSON.parse(fs.readFileSync(proofFile, 'utf8')); }
      catch { throw new Error('qualification proof unreadable or malformed'); }
      saveProven(proof, result.resources, { now: injectedNow });
      result = discoverResources({ swarm, now: injectedNow });
    }
    if (approval !== undefined) {
      result.approved = saveApproval(approval, result.resources, {
        workspace: result.workspace,
        swarm,
        now: new Date(injectedNow),
      });
      result.lastApproved = result.approved;
    }
    if (json) console.log(JSON.stringify(result, null, 2));
    else {
      if (proofFile) console.log('Saved dated qualification proof. Verify matching scope before dispatch.');
      if (approval !== undefined) console.log(`Saved approved resources: ${result.approved.approved.join(', ')}`);
      else console.log(result.approved ? `Approved for this swarm: ${result.approved.approved.join(', ')}` : 'No approval saved for this workspace and swarm.');
      if (result.lastApproved && !result.approved) console.log(`Last selection (recommendation only): ${result.lastApproved.approved.join(', ')}`);
      for (const resource of result.resources) {
        console.log(`${resource.state.toUpperCase()}${resource.recommended ? '*' : ''} ${resource.id}: ${resource.name}`);
        console.log(`  ${resource.status}`);
        console.log(`  cost: ${resource.cost}; route: ${resource.dispatch || 'configure ROUTES.md'}`);
        for (const proof of resource.proofs) console.log(`  proof: ${proof.at}; job ${proof.jobId}; scope ${proof.account}/${proof.environment}; ${proof.model}/${proof.effort}; return ${proof.returnRef}; evidence ${proof.evidence}`);
      }
      if (!result.resources.length) console.log('No resources detected. Configure the private overlay ROUTES.md.');
      for (const warning of result.warnings) console.log(`WARNING: ${warning}`);
      console.log(`Unproven resources: ${result.unknownIds.join(', ') || 'none'}; stale proof warnings: ${result.staleIds.join(', ') || 'none'}`);
      console.log('* proven recommendation only. Installation, authentication, overlay qualification and resource approval alone do not prove a route.');
      console.log('Save the founder\'s explicit choice with --swarm <id> --approve <id1,id2,...>.');
      console.log('Save a passed qualifying job with --save-proven <proof.json>; only proven routes do real work.');
    }
  }
} catch (err) {
  console.error(`swarm-resources: ${err.message}\n${usage}`);
  process.exitCode = 2;
}
