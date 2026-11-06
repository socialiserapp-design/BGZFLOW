// Original BGZFLOW helper for the adapted Owl card-sort method. No network or writes.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export function coGrouping(input) {
 if(!input||!Array.isArray(input.cards)||!input.cards.length||!Array.isArray(input.participants)||!input.participants.length)throw Error('Cards and participant observations are required.');
 const cards=input.cards;
 if(cards.some(c=>typeof c!=='string'||!c.trim())||new Set(cards).size!==cards.length)throw Error('Card labels must be unique nonempty strings.');
 const participantIds=new Set(),observations=[];
 for(const participant of input.participants){
  if(typeof participant?.id!=='string'||!participant.id.trim()||participantIds.has(participant.id)||!Array.isArray(participant.groups)||!participant.groups.length)throw Error('Participant observations must be distinct and contain groups.');
  participantIds.add(participant.id);const positions=new Map();
  for(const [index,group] of participant.groups.entries()){
   if(!Array.isArray(group)||!group.length)throw Error('Each group must contain observed cards.');
   for(const card of group){if(!cards.includes(card)||positions.has(card))throw Error('An unknown or multiply assigned card cannot be scored.');positions.set(card,index);}
  }
  observations.push({id:participant.id,positions,missing:cards.filter(c=>!positions.has(c))});
 }
 const pairs=[];
 for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++){
  const left=cards[i],right=cards[j];let observed=0,together=0;
  for(const {positions} of observations)if(positions.has(left)&&positions.has(right)){observed++;if(positions.get(left)===positions.get(right))together++;}
  pairs.push({left,right,together,observed,similarity:observed?together/observed:null});
 }
 return {participantCount:observations.length,cards,pairs,missingByParticipant:observations.filter(o=>o.missing.length).map(({id,missing})=>({id,missing}))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{if(process.argv.length!==3)throw Error('One owned JSON input file is required.');const result=coGrouping(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));process.stdout.write(JSON.stringify(result,null,2)+'\n');}
 catch{console.error('Cannot calculate: supply valid, authorised pseudonymous card-sort observations. No result established.');process.exitCode=1;}
}
