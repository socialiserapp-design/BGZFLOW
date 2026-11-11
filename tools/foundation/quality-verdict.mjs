import {sanitize} from '../../hooks/lib/secrets.mjs';

/** The host owns this rubric. Reports cannot choose or lower their own standard. */
export function pinQualityPlan(plan) {
  const copy=structuredClone(plan);
  if(!copy || typeof copy.version!=='string' || !copy.version.trim() || !Array.isArray(copy.criteria) || !copy.criteria.length)throw Error('A versioned quality rubric is required.');
  const ids=new Set();
  for(const c of copy.criteria){
    if(!c || typeof c.id!=='string' || !c.id.trim() || ids.has(c.id) || typeof c.expected!=='string' || !c.expected.trim() || typeof c.required!=='boolean' || !['direct','judgment'].includes(c.kind))throw Error('Each quality criterion needs a unique identity, expected result, kind and explicit required status.');
    ids.add(c.id);
    if(c.kind==='judgment' && (typeof c.calibrationRef!=='string' || !c.calibrationRef.trim()))throw Error('A judgment criterion needs a host-owned calibration reference.');
    if(c.minScore!==undefined && (!Number.isFinite(c.minScore) || c.minScore<0 || c.minScore>1 || c.kind!=='judgment'))throw Error('A score threshold must be calibrated, normalized and used for judgment.');
    Object.freeze(c);
  }
  if(!copy.criteria.some(c=>c.required))throw Error('Quality acceptance needs at least one required outcome.');
  Object.freeze(copy.criteria);return Object.freeze(copy);
}

/** Validate trusted runner observations; this cannot establish their truth or execute a judge. */
export function qualityVerdict(plan, report, target) {
  const unavailable=reason=>({matches:false,status:'unverified',reason,criteria:[]});
  if(!target?.candidate || !target?.revision || report?.candidate!==target.candidate || report?.revision!==target.revision || report?.rubricVersion!==plan.version)return unavailable('Quality evidence does not match the candidate, revision and rubric.');
  if(!Array.isArray(report.criteria))return unavailable('Quality observations are missing.');
  const byId=new Map();
  for(const item of report.criteria){
    if(!item || typeof item.id!=='string' || byId.has(item.id))return unavailable('Quality observations have invalid or duplicate identities.');
    byId.set(item.id,item);
  }
  const criteria=plan.criteria.map(criterion=>{
    const row=byId.get(criterion.id);
    let verdict=row?.verdict;
    if(!['meets','fails','unverified','needs-decision'].includes(verdict) || row?.kind!==criterion.kind || !Array.isArray(row.evidence) || !row.evidence.length || !row.evidence.every(e=>typeof e==='string'&&e.trim()) || typeof row.reason!=='string' || !row.reason.trim())verdict='unverified';
    if(criterion.kind==='judgment' && row?.calibrationRef!==criterion.calibrationRef)verdict='unverified';
    if(verdict==='meets' && criterion.minScore!==undefined){
      if(!Number.isFinite(row.score) || row.score<0 || row.score>1)verdict='unverified';
      else if(row.score<criterion.minScore)verdict='fails';
    }
    return {id:sanitize(criterion.id),required:criterion.required,verdict};
  });
  const required=criteria.filter(c=>c.required),matches=required.every(c=>c.verdict==='meets');
  // Preserve individual states: a known failure is repairable even if another
  // criterion still needs evidence or a product decision. No average hides it.
  const status=matches?'meets':required.some(c=>c.verdict==='fails')?'fails':required.some(c=>c.verdict==='needs-decision')?'needs-decision':'unverified';
  return {matches,status,criteria};
}
