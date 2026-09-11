import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { createStore } from './store.js';
import { accountsFor, syncSource, command, deadlineCheck, view, hash, PaymentError, canSee, nowOf } from './domain.js';

export function createPaymentService({filename,readSource,intervalMs=60000}={}) {
 const store=createStore(filename);let lastError=null;
 function sync(){store.transaction(s=>{syncSource(s,readSource());deadlineCheck(s);});}
 sync();
 const timer=intervalMs?setInterval(()=>{try{sync();lastError=null;}catch(e){lastError='Deadline worker failed; check backend logs.';console.error('Payment deadline worker:',e.message);}},intervalMs):null;timer?.unref();
 const router=Router();
 router.use((req,res,next)=>{
  res.set('Cache-Control','no-store');
  const origin=req.get('origin');
  if(origin){try{const url=new URL(origin),local=['localhost','127.0.0.1','[::1]'].includes(url.hostname),sameOrigin=url.host===req.get('host');if(!local&&!sameOrigin)return res.status(403).json({error:'Cross-origin requests are not allowed.'});}catch{return res.status(403).json({error:'Invalid origin.'});}}
  next();
 });
 router.get('/accounts',(_req,res)=>res.json({mode:'local-demo',accounts:accountsFor(readSource())}));
 router.post('/session',(req,res)=>{
  const a=accountsFor(readSource()).find(a=>a.id===req.body.accountId);if(!a)return res.status(422).json({error:'Choose a listed demo account.'});
  const token=randomUUID();store.session(token,a.id,Date.now()+8*3600000);
  res.cookie('vyavsay_payment_v2',token,{httpOnly:true,sameSite:'strict',maxAge:8*3600000,path:'/api/payments'});res.json({actor:a});
 });
 router.use((req,res,next)=>{
  const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('vyavsay_payment_v2='))?.split('=')[1];
  const session=token&&store.getSession(token), actor=session&&accountsFor(readSource()).find(a=>a.id===session.account_id);
  if(!actor)return res.status(401).json({error:'Choose a payment demo account to continue.'});req.actor=actor;next();
 });
 router.get('/',(req,res,next)=>{try{sync();res.json({...view(store.read(),req.actor),workerError:lastError});}catch(e){next(e);}});
 router.get('/summary',(req,res,next)=>{try{sync();res.json(view(store.read(),req.actor).summary);}catch(e){next(e);}});
 router.get('/submissions/:id/evidence',(req,res)=>{
  const s=store.read(),sub=s.submissions.find(x=>x.id===req.params.id),c=sub&&s.contracts.find(c=>c.id===sub.contractId);
  if(!c||!canSee(req.actor,c))return res.status(404).json({error:'Evidence not found.'});
  const file=sub.attachment;
  res.set({'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="${file?file.name:'evidence-report.txt'}"`,'X-Content-Type-Options':'nosniff'}).send(file?Buffer.from(file.base64,'base64'):Buffer.from(sub.report));
 });
 router.post('/:target/:action',(req,res,next)=>{
  try{
   const key=req.get('Idempotency-Key');if(!key||key.length>100)throw new PaymentError('A valid idempotency key is required.',422);
   const identity=`${req.actor.id}:${key}`,requestHash=hash({target:req.params.target,action:req.params.action,payload:req.body});
   store.transaction(s=>{
    const previous=s.commands.find(x=>x.identity===identity);
    if(previous){if(previous.requestHash!==requestHash)throw new PaymentError('This request key was already used for different data.');return;}
    if(req.params.target==='demo'&&req.params.action==='advance-clock'){
      if(req.actor.role!=='reviewer')throw new PaymentError('Only the independent demo reviewer can advance the demo clock.',403);
      if(!Number.isInteger(req.body.days)||req.body.days<1||req.body.days>30)throw new PaymentError('Advance by 1–30 whole days.',422);
      s.clockOffsetDays+=req.body.days;
      s.audit.push({id:randomUUID(),contractId:null,milestoneId:null,actorId:req.actor.id,actorName:req.actor.name,role:req.actor.role,action:'Demo clock advanced',at:nowOf(s),details:{days:req.body.days}});
      deadlineCheck(s);
    }else command(s,readSource(),req.actor,req.params.target,req.params.action,req.body);
    s.commands.push({id:randomUUID(),identity,requestHash,at:nowOf(s)});
   });
   res.json(view(store.read(),req.actor));
  }catch(e){next(e);}
 });
 router.use((err,_req,res,_next)=>{
  const status=err instanceof PaymentError?err.status:500;
  if(status===500)console.error('Payment error:',err.message);
  res.status(status).json({error:status===500?'Payment could not be saved. No changes were committed.':err.message});
 });
 return {router,store,sync,close(){if(timer)clearInterval(timer);store.close();},projectContract(raw){
  const s=store.read();return {...raw,milestones:raw.milestones.map(m=>{
    const p=s.payments.find(p=>p.milestoneId===m.id);return {...m,status:p?.status==='paid'?'Paid (simulated)':p?.status==='approved'?'Payment Approved':p?'Payment in progress':m.status==='Paid'?'Imported paid (unverified)':m.status};
  })};
 }};
}
