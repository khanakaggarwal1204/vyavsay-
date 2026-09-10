import { Router } from 'express';
import { randomUUID, randomInt } from 'node:crypto';
import { createStore } from './store.js';
import { accounts, packets, hash } from './source.js';
import { command, sync, view, gate, integrity, requireThat, ValidationError } from './domain.js';

export function createValidationService({readSource,readPayments,filename,intervalMs=60000,now=()=>new Date().toISOString(),rng=randomInt}={}) {
  const store=createStore(filename),router=Router();let workerError=null;
  const context=s=>{const source=readSource();return {packets:packets(source,readPayments(),s.demoRevisions),registry:accounts(source)};};
  function tick(){store.transaction(s=>{const c=context(s);sync(s,c.packets,c.registry,now(),rng);});workerError=null;}
  function refresh(){try{tick();}catch(e){workerError='Validation processing is blocked; review data integrity and backend logs.';console.error('Validation worker:',e.message);}}
  refresh();const timer=intervalMs?setInterval(refresh,intervalMs):null;timer?.unref();
  router.use((req,res,next)=>{
    res.set('Cache-Control','no-store');
    const origin=req.get('origin');
    if(origin){try{requireThat(['localhost','127.0.0.1','[::1]'].includes(new URL(origin).hostname),'Local demo requests only.',403);}catch(e){return res.status(403).json({error:'Local demo requests only.'});}}
    next();
  });
  router.get('/accounts',(_req,res)=>res.json({mode:'local-demo',accounts:accounts(readSource())}));
  router.post('/session',(req,res)=>{
    const actor=accounts(readSource()).find(a=>a.id===req.body?.accountId);
    if(!actor)return res.status(422).json({error:'Select a listed demo account.'});
    const token=randomUUID();store.session(token,actor.id);
    res.cookie('vyavsay_validation_v3',token,{httpOnly:true,sameSite:'strict',maxAge:8*3600000,path:'/api/validation'});res.json({actor});
  });
  router.use((req,res,next)=>{
    const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('vyavsay_validation_v3='))?.split('=')[1];
    const actorId=store.actor(token),actor=accounts(readSource()).find(a=>a.id===actorId);
    if(!actor)return res.status(401).json({error:'Choose a validation demo account.'});req.actor=actor;next();
  });
  const output=actor=>{const s=store.read(),c=context(s);return {...view(s,c.packets,c.registry,actor),workerError};};
  router.get('/',(req,res,next)=>{try{refresh();res.json(output(req.actor));}catch(e){next(e);}});
  router.get('/checkpoint',(req,res,next)=>{try{requireThat(req.actor.role==='admin','Oversight only.',403);const s=store.read();res.set('Content-Disposition','attachment; filename="validation-audit-checkpoint.json"').json({generatedAt:now(),valid:integrity(s),seq:s.audit.at(-1)?.seq||0,entryHash:s.audit.at(-1)?.entryHash||'GENESIS'});}catch(e){next(e);}});
  router.post('/:caseId/:action',(req,res,next)=>{try{
    const key=req.get('Idempotency-Key');requireThat(typeof key==='string'&&key.length>=8&&key.length<=100,'An idempotency key (8–100 characters) is required.',422);
    const identity=req.actor.id+':'+key,requestHash=hash({caseId:req.params.caseId,action:req.params.action,body:req.body});
    store.transaction(s=>{
      requireThat(integrity(s),'Audit integrity failure. Writes blocked.');
      const prev=s.commands.find(c=>c.identity===identity);
      if(prev){requireThat(prev.requestHash===requestHash,'Request key was already used with different data.');return;}
      let c=context(s);sync(s,c.packets,c.registry,now(),rng);
      command(s,c.packets,c.registry,req.actor,req.params.caseId,req.params.action,req.body,now(),rng);
      c=context(s);sync(s,c.packets,c.registry,now(),rng);
      s.commands.push({identity,requestHash,at:now()});
    });res.json(output(req.actor));
  }catch(e){next(e);}});
  router.use((err,_req,res,_next)=>{if(!(err instanceof ValidationError))console.error('Validation:',err.message);res.status(err.status||500).json({error:err.status?err.message:'Validation could not be saved. No changes were committed.'});});
  return {router,store,tick,scaleUpInputs(){
    tick();const s=store.read(),c=context(s);
    requireThat(integrity(s),'Validation integrity failure.');
    return c.packets.map(packet=>{const round=s.rounds.filter(r=>r.caseId===packet.id).at(-1);
      return {packet,gate:gate(s,packet),snapshotHash:round?.snapshotHash||null,snapshot:round?.snapshot||null,
        findings:s.decisions.filter(d=>d.roundId===round?.id&&['approved','rejected','corrections'].includes(d.result)).map(d=>({result:d.result,checks:d.checks,snapshotHash:d.snapshotHash}))};
    });
  },close(){if(timer)clearInterval(timer);store.close();},gateForDesign(id){
    refresh();const s=store.read(),c=context(s),linked=c.packets.filter(p=>p.pilotDesignId===id&&!p.synthetic);
    if(workerError||linked.length!==1)return {eligible:false,reasons:['A single linked, independently validated contract is required.']};
    return gate(s,linked[0]);
  }};
}
