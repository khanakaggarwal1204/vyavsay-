import {randomUUID} from 'node:crypto';
import {hash,departmentId} from '../validation/source.js';
export class ScaleUpError extends Error{constructor(message,status=409){super(message);this.status=status;}}
export const check=(ok,message,status=409)=>{if(!ok)throw new ScaleUpError(message,status);};
const text=(v,label,min=15)=>{check(typeof v==='string'&&v.trim().length>=min&&v.length<=10000,`${label}: enter ${min}–10,000 characters.`,422);return v.trim();};
const money=(v,label)=>{check(Number.isSafeInteger(v)&&v>0&&v<=100000000000,`${label}: enter a positive amount in integer paise.`,422);return v;};
const clamp=v=>Math.min(100,Math.max(0,v));
const latest=(s,id)=>s.proposals.filter(p=>p.caseId===id).at(-1);
export const POLICY=Object.freeze({version:1,weights:{performance:0.4,deployment:0.25,sustainability:0.2,riskControls:0.15},expansionThreshold:80,pilotThreshold:60,reviewDays:7,validDays:90,source:'Prototype policy; not a legal standard'});
export function accounts(source){
 const depts=[...new Set((source.challenges||[]).map(c=>c.dept).filter(Boolean))].map(name=>({id:departmentId(name),name}));depts.push({id:'demo-department',name:'Demo department'});
 return [...depts.flatMap(d=>['proposer','finance','procurement','authority'].map(role=>({id:`scaleup:${role}:${d.id}`,personId:`scaleup:${role}:${d.id}`,name:`${d.name} · ${role}`,role,organisationId:d.id,authority:role==='proposer'?null:'local-demo-delegation',conflicts:[]}))),...(source.startups||[]).map(s=>({id:'startup:'+s.id,personId:'startup:'+s.id,name:s.name+' · Startup',role:'startup',organisationId:s.id})),{id:'startup:demo',personId:'startup:demo',name:'Demo startup',role:'startup',organisationId:'demo-startup'},{id:'scaleup:admin',personId:'scaleup:admin',name:'Oversight administrator · Read only',role:'admin',organisationId:'oversight'}];
}
export const visible=(a,c)=>a.role==='admin'||(a.role==='startup'?a.organisationId===c.packet.startupId:a.organisationId===c.packet.departmentId);
export function event(s,actor,type,caseId,data,now){const e={seq:s.audit.length+1,actorId:actor,type,caseId,data:structuredClone(data),at:now,previousHash:s.audit.at(-1)?.entryHash||'GENESIS'};s.audit.push({...e,entryHash:hash(e)});}
function save(s,table,row,actor,now){row=structuredClone(row);s[table].push(row);event(s,actor,'record_created',row.caseId,{table,id:row.id,hash:hash(row)},now);return row;}
export function integrity(s){let previous='GENESIS';for(let i=0;i<s.audit.length;i++){const {entryHash,...e}=s.audit[i];if(e.seq!==i+1||e.previousHash!==previous||entryHash!==hash(e))return false;previous=entryHash;}for(const table of ['proposals','recommendations','reviews','decisions']){for(const row of s[table])if(!s.audit.some(e=>e.type==='record_created'&&e.data.table===table&&e.data.id===row.id&&e.data.hash===hash(row)))return false;for(const e of s.audit.filter(e=>e.type==='record_created'&&e.data.table===table))if(!s[table].some(r=>r.id===e.data.id))return false;}return true;}
function proposalData(payload){
 check(Array.isArray(payload.locations)&&payload.locations.length>=1&&payload.locations.length<=50,'Provide 1–50 assessed locations.',422);
 const locations=payload.locations.map(l=>({name:text(l.name,'Location',2),ready:l.ready===true,evidence:text(l.evidence,'Location readiness evidence')}));
 check(new Set(locations.map(l=>l.name.toLowerCase())).size===locations.length,'Duplicate locations are not allowed.',422);
 check(Number.isInteger(payload.volume)&&payload.volume>0&&payload.volume<=1000000,'Volume must be 1–1,000,000 units.',422);
 check(Number.isInteger(payload.months)&&payload.months>0&&payload.months<=60,'Duration must be 1–60 months.',422);
 check(Number.isInteger(payload.capacity)&&payload.capacity>0&&payload.capacity<=1000000,'Supported capacity is required.',422);
 const upfrontPaise=money(payload.upfrontPaise,'Upfront cost'),monthlyPaise=money(payload.monthlyPaise,'Monthly operating cost');
 const totalPaise=upfrontPaise+monthlyPaise*payload.months;check(Number.isSafeInteger(totalPaise)&&totalPaise<=100000000000,'Total cost exceeds the prototype ceiling.',422);
 const risks=['security','continuity','dataIP'].map(key=>{const r=payload.risks?.find(r=>r.key===key);check(r&&typeof r.effective==='boolean'&&typeof r.critical==='boolean','Complete every risk assessment.',422);return {key,effective:r.effective,critical:r.critical,evidence:text(r.evidence,'Risk-control evidence')};});
 return {locations,volume:payload.volume,months:payload.months,capacity:payload.capacity,capacityEvidence:text(payload.capacityEvidence,'Capacity evidence'),upfrontPaise,monthlyPaise,totalPaise,baselineUnitMonthlyPaise:money(payload.baselineUnitMonthlyPaise,'Baseline unit/month cost'),costEvidence:text(payload.costEvidence,'Cost and baseline evidence'),assumptions:text(payload.assumptions,'Cost assumptions'),risks};
}
function inputs(p,c){return {proposalId:p.id,proposalVersion:p.version,policy:POLICY,validationRoundId:c.gate.roundId,validationSnapshotHash:c.snapshotHash,validationEligible:c.gate.eligible,validationReasons:c.gate.reasons,findings:c.findings,sourceRisk:c.packet.risk,proposal:p.facts};}
export function assess(p,c){
 const reasons=[...c.gate.reasons];if(!c.gate.eligible&&!reasons.length)reasons.push('Independent validation is not eligible.');
 const facts=p.facts,kpis=c.snapshot?.kpis||[];const critical=facts.risks.some(r=>r.critical&&!r.effective);
 if(critical)reasons.push('Resolve critical risk findings before expansion.');
 const measurements=[];
 if(!kpis.length)reasons.push('Validated KPI snapshot is missing.');
 for(const k of kpis){const results=(c.findings||[]).filter(d=>d.result==='approved').map(d=>d.checks?.find(x=>x.key===k.key));if(!results.length||results.some(r=>!r?.verified||!Number.isFinite(r.verifiedValue))||![k.baseline,k.target].every(Number.isFinite)||k.baseline===k.target){reasons.push(`${k.label}: independent KPI measurements are incomplete.`);continue;}const actual=k.target>k.baseline?Math.min(...results.map(r=>r.verifiedValue)):Math.max(...results.map(r=>r.verifiedValue));const achieved=(actual-k.baseline)/(k.target-k.baseline)*100;if(k.mandatory&&achieved<100)reasons.push(`${k.label}: mandatory target failed.`);measurements.push({key:k.key,actual,achievement:clamp(achieved)});}
 if(reasons.length)return {readiness:'blocked',reasons,components:null,finalScore:null,recommendation:critical?'discontinue_review':'insufficient_evidence',summary:'Assessment blocked: '+reasons.join(' ')};
 const unitMonthly=facts.totalPaise/(facts.volume*facts.months);
 const components={performance:measurements.reduce((n,k)=>n+k.achievement,0)/measurements.length,deployment:50*Math.min(1,facts.capacity/facts.volume)+50*facts.locations.filter(l=>l.ready).length/facts.locations.length,sustainability:clamp(facts.baselineUnitMonthlyPaise/unitMonthly*100),riskControls:facts.risks.filter(r=>r.effective).length/facts.risks.length*100};
 const finalScore=Math.round(Object.entries(components).reduce((n,[k,v])=>n+v*POLICY.weights[k],0)*100)/100;
 let recommendation=finalScore>=80?'phased_expansion_review':finalScore>=60?'additional_pilot':'redesign_review';
 if(recommendation==='phased_expansion_review'&&(facts.capacity<facts.volume||facts.locations.some(l=>!l.ready)||facts.risks.some(r=>!r.effective)))recommendation='additional_pilot';
 return {readiness:'ready',reasons:[],components,measurements,estimatedUnitMonthlyPaise:unitMonthly,finalScore,recommendation,summary:`${recommendation.replaceAll('_',' ')}: ${finalScore}/100 using policy v${POLICY.version}. Capacity ${facts.capacity} for ${facts.volume} proposed units; ${facts.locations.filter(l=>l.ready).length}/${facts.locations.length} locations ready. Estimated cost ${facts.totalPaise/100} INR over ${facts.months} months. This is a recommendation for the assessed scope, not a procurement award.`};
}
export function reconcile(s,cases,now){check(integrity(s),'Scale-up audit integrity failure.');for(const p of s.proposals.filter(p=>latest(s,p.caseId)?.id===p.id)){
 const c=cases.find(c=>c.packet.id===p.caseId);if(!c)continue;
 const input=inputs(p,c),inputHash=hash(input);let rec=s.recommendations.find(r=>r.proposalId===p.id&&r.inputHash===inputHash);
 if(!rec){const result=assess(p,c);rec=save(s,'recommendations',{id:randomUUID(),caseId:p.caseId,proposalId:p.id,inputSnapshot:input,inputHash,policy:POLICY,...result,createdAt:now,dueAt:new Date(Date.parse(now)+POLICY.reviewDays*86400000).toISOString(),aiSummaryStatus:'disabled'},'system',now);}
 const state=status(s,rec,c,now);
 if(['awaiting_finance','awaiting_procurement','awaiting_authority'].includes(state)&&rec.dueAt<now)notify(s,rec.caseId,'overdue:'+rec.id,'Scale-up review overdue; no automatic approval.',now);
 if(state==='blocked')notify(s,rec.caseId,'blocked:'+rec.id,'Recommendation blocked: '+rec.reasons.join(' '),now);
 for(const d of s.decisions.filter(d=>d.caseId===p.caseId&&d.result==='approve')){
 const old=s.recommendations.find(r=>r.id===d.recommendationId);
 if(!old||old.id!==rec.id)notify(s,p.caseId,'stale:'+d.id,'Previous approval no longer matches current proposal or evidence.',now);
 else if(d.validUntil<now)notify(s,p.caseId,'expired:'+d.id,'Scale-up approval expired; request reassessment.',now);
 }
 }}
function notify(s,caseId,key,message,now){if(!s.notifications.some(n=>n.key===key)){s.notifications.push({id:randomUUID(),caseId,key,message,at:now});event(s,'system','notification',caseId,{key,message},now);}}
export function status(s,r,c,now){const p=s.proposals.find(p=>p.id===r.proposalId);if(!c||!p||latest(s,r.caseId)?.id!==p.id||hash(inputs(p,c))!==r.inputHash)return 'stale';if(r.readiness!=='ready')return 'blocked';const reviews=s.reviews.filter(a=>a.recommendationId===r.id);const decision=s.decisions.find(d=>d.recommendationId===r.id);if(decision)return decision.result==='approve'?(decision.validUntil<now?'expired':'approved'):decision.result==='reject'?'rejected':'changes_requested';if(reviews.some(a=>a.result==='reject'))return 'rejected';if(reviews.some(a=>a.result==='request_changes'))return 'changes_requested';for(const stage of ['finance','procurement'])if(!reviews.some(a=>a.stage===stage&&a.result==='approve'))return 'awaiting_'+stage;return 'awaiting_authority';}
export function eligibility(s,c,now,registry){
 const p=latest(s,c.packet.id),r=p&&s.recommendations.filter(r=>r.proposalId===p.id&&r.inputHash===hash(inputs(p,c))).at(-1);const reasons=[];
 if(!integrity(s))reasons.push('Audit integrity failure.');if(!r)reasons.push('A current recommendation is required.');
 if(r){const state=status(s,r,c,now);if(state!=='approved')reasons.push('Scale-up status: '+state);if(r.recommendation!=='phased_expansion_review')reasons.push('This outcome does not authorise live expansion.');}
 const d=r&&s.decisions.find(d=>d.recommendationId===r.id&&d.result==='approve');
 if(d){const signatures=[...s.reviews.filter(a=>a.recommendationId===r.id&&a.result==='approve'),d];const people=new Set();for(const a of signatures){const user=registry.find(u=>u.id===a.actorId);if(!user||!user.authority||user.role!==(a.stage||'authority')||user.organisationId!==c.packet.departmentId||(user.conflicts||[]).includes(c.packet.id)||people.has(user.personId)||user.personId===p.proposerPersonId)reasons.push('Approval authority or separation of duties no longer valid.');if(user)people.add(user.personId);}}
 return {eligible:reasons.length===0,reasons,decisionId:d?.id||null,proposal:p||null,recommendationId:r?.id||null};
}
export function command(s,cases,registry,actor,caseId,action,payload,now){check(integrity(s),'Audit integrity failure. Writes blocked.');const c=cases.find(c=>c.packet.id===caseId);check(c&&visible(actor,c),'Case not found.',404);const prior=latest(s,caseId);
 if(action==='submit'){
 check(actor.role==='proposer','Only the owning department proposer can submit.',403);check(payload.expectedVersion===(prior?.version||0),'Proposal changed. Refresh first.');const facts=proposalData(payload),why=text(payload.reason,'Proposal rationale');
 check(!prior||hash(facts)!==hash(prior.facts),'A revision must contain changed scope or evidence. Use reassess for changed validation.');
 save(s,'proposals',{id:randomUUID(),caseId,pilotId:c.packet.pilotId,contractId:c.packet.contractId,departmentId:c.packet.departmentId,startupId:c.packet.startupId,synthetic:c.packet.synthetic,version:(prior?.version||0)+1,facts,reason:why,proposedBy:actor.id,proposerPersonId:actor.personId,createdAt:now},actor.id,now);return;
 }
 if(action==='reassess'){
 check(actor.role==='proposer','Owning proposer required.',403);check(prior&&payload.expectedVersion===prior.version,'Current proposal version required.');
 const rec=s.recommendations.filter(r=>r.proposalId===prior.id).at(-1);check(rec,'No prior recommendation.');
 check(['expired','stale'].includes(status(s,rec,c,now)),'Reassessment requires changed inputs or expired approval.');
 save(s,'proposals',{...prior,id:randomUUID(),version:prior.version+1,reason:text(payload.reason,'Reassessment reason'),createdAt:now,proposedBy:actor.id,proposerPersonId:actor.personId},actor.id,now);return;
 }
 const r=s.recommendations.find(r=>r.id===payload.recommendationId&&r.caseId===caseId);check(r,'Recommendation not found.',404);check(payload.inputHash===r.inputHash,'Review the exact input snapshot.');
 const p=s.proposals.find(p=>p.id===r.proposalId),state=status(s,r,c,now);
 check(actor.authority&&actor.personId!==p.proposerPersonId&&!(actor.conflicts||[]).includes(caseId),'Independent delegated authority is required.',403);
 check(payload.noConflict===true,'Declare no conflict of interest.',422);
 if(action==='activate'){
 check(actor.role==='authority','Only the departmental authority can request rollout handover.',403);const gate=eligibility(s,c,now,registry);check(gate.eligible,gate.reasons.join(' '));check(gate.recommendationId===r.id,'Current decision required.');check(!s.handoffs.some(h=>h.decisionId===gate.decisionId),'Handover already requested.');
 const h={id:randomUUID(),caseId,decisionId:gate.decisionId,recommendationId:r.id,scope:p.facts,synthetic:p.synthetic,status:'queued',requestedBy:actor.id,at:now,attempts:0};s.handoffs.push(h);event(s,actor.id,'handover_queued',caseId,{id:h.id,decisionId:h.decisionId,scopeHash:hash(h.scope)},now);return;
 }
 check(action==='review','Unknown action.',404);check(['approve','reject','request_changes'].includes(payload.result),'Invalid review result.',422);
 const expectedRole={awaiting_finance:'finance',awaiting_procurement:'procurement',awaiting_authority:'authority'}[state];check(actor.role===expectedRole,'Current review stage: '+state,403);
 const signatures=s.reviews.filter(a=>a.recommendationId===r.id);check(!signatures.some(a=>a.personId===actor.personId),'A separate person is required for each stage.',403);
 const findings=text(payload.reason,'Review findings');const base={id:randomUUID(),caseId,recommendationId:r.id,inputHash:r.inputHash,proposalVersion:p.version,result:payload.result,actorId:actor.id,personId:actor.personId,authorityReference:actor.authority,noConflict:true,findings,at:now};
 if(actor.role==='authority'){
 if(payload.result==='approve'){
 check(r.recommendation==='phased_expansion_review','Only a phased expansion recommendation can receive rollout approval. Request a revised proposal for other outcomes.');
 check(payload.scopeConfirmed===true,'Confirm the exact locations, volume and cost ceiling.',422);
 const expiry=Date.parse(payload.validUntil);check(Number.isFinite(expiry)&&expiry>Date.parse(now)&&expiry<=Date.parse(now)+POLICY.validDays*86400000,'Approval expiry must be within the next 90 days.',422);
 check(signatures.find(a=>a.stage==='finance'&&a.result==='approve')?.fundingPaise>=p.facts.totalPaise,'Insufficient approved funding.');
 save(s,'decisions',{...base,approvedScope:p.facts,validUntil:new Date(expiry).toISOString(),approvalIds:signatures.map(a=>a.id),conditions:'All prerequisite reviews completed. Recheck evidence, funding authority and expiry at handover.'},actor.id,now);
 }else save(s,'decisions',base,actor.id,now);
 }else{
 const review={...base,stage:actor.role};
 if(payload.result==='approve'&&actor.role==='finance'){review.fundingReference=text(payload.fundingReference,'Funding approval reference');review.fundingPaise=money(payload.fundingPaise,'Approved funding');check(review.fundingPaise>=p.facts.totalPaise,'Funding must cover the proposed cost ceiling.');review.costVerified=payload.costVerified===true;check(review.costVerified,'Verify cost assumptions and evidence.',422);}
 if(payload.result==='approve'&&actor.role==='procurement'){review.pathwayReference=text(payload.pathwayReference,'Procurement review reference');review.requirementsSatisfied=payload.requirementsSatisfied===true;check(review.requirementsSatisfied,'Resolve procurement and critical deployment requirements before approval.',422);}
 save(s,'reviews',review,actor.id,now);
 }
}
export function view(s,cases,registry,actor,now){return {actor,mode:'local-demo',integrity:integrity(s),policy:POLICY,cases:cases.filter(c=>visible(actor,c)).map(c=>{const proposal=latest(s,c.packet.id),recommendations=s.recommendations.filter(r=>r.caseId===c.packet.id),r=proposal&&recommendations.filter(r=>r.proposalId===proposal.id&&r.inputHash===hash(inputs(proposal,c))).at(-1);return {case:{id:c.packet.id,title:c.packet.title,startupName:c.packet.startupName,synthetic:c.packet.synthetic,risk:c.packet.risk},validation:c.gate,validationEvidence:c.snapshot?{kpis:c.snapshot.kpis,findings:c.findings}:null,paymentContext:{milestones:c.packet.milestones?.map(m=>({name:m.name,payment:m.payment})),disputes:c.packet.disputes||[]},proposal:proposal||null,recommendation:r?{...r,status:status(s,r,c,now)}:null,eligibility:eligibility(s,c,now,registry),reviews:s.reviews.filter(a=>a.recommendationId===r?.id),decision:s.decisions.find(d=>d.recommendationId===r?.id)||null,history:recommendations.map(x=>({id:x.id,score:x.finalScore,status:status(s,x,c,now),recommendation:x.recommendation,createdAt:x.createdAt,inputHash:x.inputHash})),notifications:s.notifications.filter(n=>n.caseId===c.packet.id),handoffs:s.handoffs.filter(h=>h.caseId===c.packet.id).map(({lastError,...h})=>({...h,lastError:lastError?'Handover pending; see backend logs.':null})),audit:actor.role==='admin'?s.audit.filter(e=>e.caseId===c.packet.id):[]};})};}
