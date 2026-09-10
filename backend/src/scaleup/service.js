import {Router} from 'express';
import {randomUUID} from 'node:crypto';
import {hash} from '../validation/source.js';
import {createStore} from './store.js';
import {accounts,check,command,reconcile,view,eligibility,event,integrity,visible,ScaleUpError} from './domain.js';
export function createScaleUpService({readSource,readValidation,applyHandoff,filename,intervalMs=60000,now=()=>new Date().toISOString()}={}){
 const store=createStore(filename),router=Router();let workerError=null;
 const context=()=>({cases:readValidation(),registry:accounts(readSource())});
 function tick(){const c=context();store.transaction(s=>reconcile(s,c.cases,now()));workerError=null;}
 function dispatch(){
  for(const h of store.read().handoffs.filter(h=>h.status==='queued')){
   const c=context(),s=store.read(),item=c.cases.find(c=>c.packet.id===h.caseId),g=item&&eligibility(s,item,now(),c.registry);
   if(!g?.eligible||g.decisionId!==h.decisionId||hash(h.scope)!==hash(g.proposal?.facts)){store.transaction(s=>{const item=s.handoffs.find(x=>x.id===h.id);item.status='blocked';event(s,'system','handover_blocked',h.caseId,{handoffId:h.id,reasons:g?.reasons||['Source unavailable']},now());});continue;}
   try{
    if(!h.synthetic){check(applyHandoff,'Rollout adapter unavailable.');applyHandoff(h,item.packet);}
    store.transaction(s=>{const item=s.handoffs.find(x=>x.id===h.id);item.status='completed';item.completedAt=now();item.attempts++;event(s,'system','handover_completed',h.caseId,{handoffId:h.id,decisionId:h.decisionId,synthetic:h.synthetic},now());});
   }catch(e){console.error('Scale-up handover:',e.message);store.transaction(s=>{const item=s.handoffs.find(x=>x.id===h.id);item.attempts++;item.lastError=e.message;});}
  }
 }
 function refresh(){try{tick();dispatch();}catch(e){workerError='Scale-up processing blocked: source or integrity check failed.';console.error('Scale-up worker:',e.message);}}
 refresh();const timer=intervalMs?setInterval(refresh,intervalMs):null;timer?.unref();
 router.use((req,res,next)=>{res.set('Cache-Control','no-store');const origin=req.get('origin');if(origin){try{if(!['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname))return res.status(403).json({error:'Local demo requests only.'});}catch{return res.status(403).json({error:'Invalid origin.'});}}next();});
 router.get('/accounts',(_req,res)=>res.json({mode:'local-demo',accounts:accounts(readSource())}));
 router.post('/session',(req,res)=>{const a=accounts(readSource()).find(a=>a.id===req.body?.accountId);if(!a)return res.status(422).json({error:'Choose a listed scale-up account.'});const token=randomUUID();store.session(token,a.id);res.cookie('vyavsay_scaleup',token,{httpOnly:true,sameSite:'strict',maxAge:28800000,path:'/api/scale-up'});res.json({actor:a});});
 router.use((req,res,next)=>{const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('vyavsay_scaleup='))?.split('=')[1];const id=store.actor(token),actor=accounts(readSource()).find(a=>a.id===id);if(!actor)return res.status(401).json({error:'Choose a scale-up demo account.'});req.actor=actor;next();});
 function output(actor){const c=context();return {...view(store.read(),c.cases,c.registry,actor,now()),workerError};}
 router.get('/',(req,res,next)=>{try{refresh();res.json(output(req.actor));}catch(e){next(e);}});
 router.get('/:caseId/export',(req,res,next)=>{try{refresh();const item=output(req.actor).cases.find(c=>c.case.id===req.params.caseId);check(item,'Case not found.',404);res.set({'Content-Type':'application/json','Content-Disposition':'attachment; filename="scale-up-report.json"'}).json({label:item.recommendation?.status==='approved'?'LOCAL DEMO APPROVAL — NOT A PROCUREMENT AWARD':'DRAFT — NOT AUTHORISED',generatedAt:now(),...item});}catch(e){next(e);}});
 router.post('/:caseId/:action',(req,res,next)=>{try{
  const key=req.get('Idempotency-Key');check(key&&key.length>=8&&key.length<=100,'Idempotency key (8–100 characters) required.',422);const identity=req.actor.id+':'+key,requestHash=hash({caseId:req.params.caseId,action:req.params.action,payload:req.body});const c=context();
  store.transaction(s=>{check(integrity(s),'Audit integrity failure.');const prev=s.commands.find(x=>x.identity===identity);if(prev){check(prev.requestHash===requestHash,'Request key reused with different data.');return;}
   reconcile(s,c.cases,now());command(s,c.cases,c.registry,req.actor,req.params.caseId,req.params.action,req.body,now());reconcile(s,c.cases,now());s.commands.push({identity,requestHash,at:now()});
  });refresh();res.json(output(req.actor));
 }catch(e){next(e);}});
 router.use((err,_req,res,_next)=>{if(!(err instanceof ScaleUpError))console.error('Scale-up:',err.message);res.status(err.status||500).json({error:err.status?err.message:'Scale-up could not be saved. No approval was granted.'});});
 return {router,store,tick,dispatch,close(){if(timer)clearInterval(timer);store.close();}};
}
