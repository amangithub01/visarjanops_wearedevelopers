import http from 'node:http';
import { URL } from 'node:url';
import { randomUUID, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { read, write, seed } from './store.js';
import { getApifyStatus, runConfiguredApifyActor } from './apify.js';
const PORT = Number(process.env.PORT || 4173);
const demo = process.env.DEMO_MODE !== 'false';
const publicRoot=process.cwd();
const opsSessions=new Map(),loginAttempts=new Map();
const sessionMaxAge=8*60*60*1000;
const credentialsConfigured=()=>Boolean(process.env.OPS_USERNAME&&process.env.OPS_PASSWORD&&process.env.OPS_PASSWORD.length>=12);
function sessionFor(req){const raw=(req.headers.cookie||'').match(/(?:^|;\s*)visarjanops_ops=([^;]+)/)?.[1];if(!raw)return null;let token;try{token=decodeURIComponent(raw)}catch{return null;}const key=createHash('sha256').update(token).digest('hex'),session=opsSessions.get(key);if(!session||session.expiresAt<Date.now()){opsSessions.delete(key);return null;}return {key,...session};}
const secureEqual=(a,b)=>timingSafeEqual(createHash('sha256').update(String(a)).digest(),createHash('sha256').update(String(b)).digest());
let reservationQueue=Promise.resolve();
const exclusive=async work=>{let release;const previous=reservationQueue;reservationQueue=new Promise(r=>release=r);await previous;try{return await work();}finally{release();}};
await seed();
const send = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' }); res.end(JSON.stringify(body)); };
const body = req => new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>12000)reject(new Error('Request too large'));});req.on('end',()=>{try{resolve(s?JSON.parse(s):{});}catch{reject(new Error('Invalid JSON'));}});});
const api=http.createServer(async(req,res)=>{if(req.method==='OPTIONS'){send(res,204,{});return;}const u=new URL(req.url,'http://localhost');const path=u.pathname;
try {
 if(path==='/api/v1/operations/auth/session'&&req.method==='GET'){const session=sessionFor(req);send(res,200,{data:session?{authenticated:true,role:'operations',expiresAt:new Date(session.expiresAt).toISOString()}:{authenticated:false,loginConfigured:credentialsConfigured()}});return;}
 if(path==='/api/v1/operations/auth/login'&&req.method==='POST'){const ip=req.socket.remoteAddress||'local',now=Date.now(),attempt=loginAttempts.get(ip)||{count:0,until:now+5*60*1000};if(attempt.until<now){attempt.count=0;attempt.until=now+5*60*1000;}if(attempt.count>=5){send(res,429,{error:'Too many sign-in attempts. Wait a few minutes and try again.'});return;}if(!credentialsConfigured()){send(res,503,{error:'Operations sign-in is not configured. Set OPS_USERNAME and OPS_PASSWORD (at least 12 characters) before starting the server.'});return;}const x=await body(req);if(!secureEqual(x.username||'',process.env.OPS_USERNAME)||!secureEqual(x.password||'',process.env.OPS_PASSWORD)){attempt.count++;loginAttempts.set(ip,attempt);send(res,401,{error:'The username or password is incorrect.'});return;}loginAttempts.delete(ip);const token=randomBytes(32).toString('base64url'),key=createHash('sha256').update(token).digest('hex'),expiresAt=now+sessionMaxAge;opsSessions.set(key,{role:'operations',expiresAt});const secure=process.env.NODE_ENV==='production'?'; Secure':'';res.setHeader('Set-Cookie',`visarjanops_ops=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${sessionMaxAge/1000}${secure}`);send(res,200,{data:{role:'operations',expiresAt:new Date(expiresAt).toISOString()}});return;}
 if(path==='/api/v1/operations/auth/logout'&&req.method==='POST'){const session=sessionFor(req);if(session)opsSessions.delete(session.key);res.setHeader('Set-Cookie','visarjanops_ops=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');send(res,200,{data:{loggedOut:true}});return;}
 if(path==='/api/v1/operations/sites'&&req.method==='GET'){if(!sessionFor(req)){send(res,401,{error:'Operations sign-in required.'});return;}const db=await read();send(res,200,{data:db.sites});return;}
 if(path==='/api/v1/operations/apify/status'&&req.method==='GET'){if(!sessionFor(req)){send(res,401,{error:'Operations sign-in required.'});return;}const db=await read(),status=getApifyStatus();send(res,200,{data:{...status,latestImport:db.apifyImports?.[0]||null}});return;}
 if(path==='/api/v1/operations/apify/run'&&req.method==='POST'){
  if(!sessionFor(req)){send(res,401,{error:'Operations sign-in required.'});return;}
  try{
   const items=await runConfiguredApifyActor(),status=getApifyStatus();
   const latestImport={id:randomUUID(),actorId:status.actorId,importedAt:new Date().toISOString(),reviewStatus:'pending-review',itemCount:items.length,items};
   await exclusive(async()=>{const db=await read();db.apifyImports=[latestImport,...(db.apifyImports||[])].slice(0,3);await write(db);});
   send(res,200,{data:latestImport});
  }catch(e){send(res,e.statusCode||502,{error:e.message||'The Apify import failed.'});}
  return;
 }
 if(path==='/api/v1/public/sites'&&req.method==='GET'){const db=await read();let sites=db.sites;if(u.searchParams.get('q'))sites=sites.filter(s=>`${s.name} ${s.area}`.toLowerCase().includes(u.searchParams.get('q').toLowerCase()));send(res,200,{data:sites});return;}
 let m=path.match(/^\/api\/v1\/public\/sites\/([^/]+)$/);if(m&&req.method==='GET'){const db=await read(),site=db.sites.find(x=>x.id===m[1]);send(res,site?200:404,{data:site||null});return;}
 m=path.match(/^\/api\/v1\/public\/bookings\/([^/]+)$/);if(m&&req.method==='GET'){const db=await read(),b=db.bookings.find(x=>x.reference===m[1]&&x.secretHash===createHash('sha256').update(u.searchParams.get('key')||'').digest('hex'));send(res,b?200:404,{data:b?publicBooking(b,db):null});return;}
 if(path==='/api/v1/public/bookings'&&req.method==='POST'){const x=await body(req);if(!x.siteId||!x.slot||!x.name||!/^\S+@\S+\.\S+$/.test(x.email||'')||!Number.isInteger(x.people)||x.people<1||x.people>12){send(res,400,{error:'Check the required details and group size (1–12).'});return;}const result=await exclusive(async()=>{const db=await read(),site=db.sites.find(s=>s.id===x.siteId);if(!site||site.status==='Paused')return {error:'This site is currently unavailable.'};const slot=db.slots.find(s=>s.siteId===x.siteId&&s.time===x.slot);if(!slot||slot.booked+x.people>slot.capacity)return {error:'Those spaces have just been taken. Choose another time.'};slot.booked+=x.people;const key=randomBytes(24).toString('base64url'),reference=`VJ-${randomBytes(4).toString('hex').toUpperCase()}`;const booking={id:randomUUID(),reference,secretHash:createHash('sha256').update(key).digest('hex'),siteId:x.siteId,slot:x.slot,people:x.people,name:x.name,email:x.email,createdAt:new Date().toISOString(),status:'Confirmed',checkedIn:false,requests:[]};db.bookings.push(booking);await write(db);return {...publicBooking(booking,db),recoveryKey:key};});if(result.error){send(res,409,{error:result.error});return;}send(res,201,{data:result});return;}
 m=path.match(/^\/api\/v1\/public\/assistance-requests$/);if(m&&req.method==='POST'){const x=await body(req);if(!x.bookingReference||!x.category){send(res,400,{error:'Booking and assistance type are required.'});return;}const db=await read(),b=db.bookings.find(y=>y.reference===x.bookingReference);if(!b){send(res,404,{error:'Booking not found.'});return;}const request={reference:`HELP-${randomBytes(3).toString('hex').toUpperCase()}`,category:x.category,note:String(x.note||'').slice(0,300),status:'Received',createdAt:new Date().toISOString()};b.requests.push(request);await write(db);send(res,201,{data:request});return;}
 m=path.match(/^\/api\/v1\/public\/assistance-requests\/([^/]+)$/);if(m&&req.method==='GET'){const db=await read(),r=db.bookings.flatMap(b=>b.requests||[]).find(x=>x.reference===m[1]);send(res,r?200:404,{data:r||null});return;}
 m=path.match(/^\/api\/v1\/public\/bookings\/([^/]+)\/pass$/);if(m&&req.method==='GET'){const key=u.searchParams.get('key')||'',db=await read(),b=db.bookings.find(x=>x.reference===m[1]&&x.secretHash===createHash('sha256').update(key).digest('hex'));send(res,b?200:404,{data:b?{reference:b.reference,qrPayload:`visarjanops://${b.reference}?key=${key}`,expiresAt:new Date(Date.now()+86400000).toISOString()}:null});return;}
 if(path==='/api/v1/public/feedback'&&req.method==='POST'){const x=await body(req);const db=await read();db.feedback.push({...x,id:randomUUID(),createdAt:new Date().toISOString()});await write(db);send(res,201,{data:{received:true}});return;}
 if(path==='/api/v1/public/demo/reset'&&req.method==='POST'&&demo){await seed(true);send(res,200,{data:{reset:true}});return;}
 if(path==='/api/v1/public/live'&&req.method==='GET'){res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache','access-control-allow-origin':'*'});const pulse=async()=>{if(res.destroyed)return;const db=await read();res.write(`data: ${JSON.stringify({sites:db.sites.map(s=>({id:s.id,waiting:s.waiting,updatedAt:new Date().toISOString()}))})}\n\n`);};await pulse();const t=setInterval(pulse,15000);req.on('close',()=>clearInterval(t));return;}
 if(req.method==='GET'){const assets={'/':'index.html','/index.html':'index.html','/src.js':'src.js','/styles.css':'styles.css','/assets/ganesh-logo.jpg':'public/assets/ganesh-logo.jpg'},name=assets[path];if(name){const target=join(publicRoot,name);try{if((await stat(target)).isFile()){const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg'};res.writeHead(200,{'content-type':types[extname(target)]||'application/octet-stream','x-content-type-options':'nosniff','cache-control':'no-cache'});createReadStream(target).pipe(res);return;}}catch{}}}
 send(res,404,{error:'Route not found'});
} catch(e){send(res,500,{error:e.message||'Request failed'});}});
api.listen(PORT,'127.0.0.1',()=>console.log(`VisarjanOps API and web app: http://localhost:${PORT}`));
function publicBooking(b,db){const s=db.sites.find(x=>x.id===b.siteId);const {secretHash,...safe}=b;return {...safe,siteName:s?.name,siteArea:s?.area};}
