const {parseMermaid}=require('../../skills/statechart/scripts/lib.mjs');
const {isDeepStrictEqual}=require('node:util');
function verifyRecoveryDiagram(source){
  try{
    const diagram=parseMermaid(source),regions=Object.values(diagram.regions);
    if(regions.length!==1||diagram.nevers.length)return false;
    const region=regions[0],edges=region.transitions.map(t=>`${t.from}->${t.to}`).sort();
    return isDeepStrictEqual([...region.states].sort(),['Draft','Failed','Saved','Sending','Unknown'])
      &&isDeepStrictEqual([...region.initial],['Draft'])
      &&isDeepStrictEqual(edges,['Draft->Sending','Failed->Sending','Sending->Saved','Sending->Unknown','Unknown->Failed','Unknown->Saved']);
  }catch{return false;}
}
module.exports={verifyRecoveryDiagram};
