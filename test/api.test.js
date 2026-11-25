import { test } from 'node:test';
import assert from 'node:assert/strict';
const base=`http://localhost:${process.env.PORT||4173}/api/v1/public`;
const apiRoot=`http://localhost:${process.env.PORT||4173}/api/v1`;
async function request(path,options={}){const response=await fetch(base+path,{...options,headers:{'content-type':'application/json',...(options.headers||{})}});return {status:response.status,body:await response.json()};}
async function opsRequest(path,options={}){const response=await fetch(apiRoot+path,{...options,headers:{'content-type':'application/json',...(options.headers||{})}});return {status:response.status,body:await response.json(),headers:response.headers};}
test('demo booking persists, protects recovery, enforces capacity, and accepts assistance',async()=>{
 const reset=await request('/demo/reset',{method:'POST',body:'{}'});assert.equal(reset.status,200);
 const sites=await request('/sites');assert.equal(sites.status,200);assert.equal(sites.body.data.length,8);
 const payload=i=>JSON.stringify({siteId:'lakeview',slot:'6:00 – 6:30 PM',people:3,name:`Demo ${i}`,email:`demo${i}@example.test`});
 const responses=await Promise.all([0,1,2,3].map(i=>request('/bookings',{method:'POST',body:payload(i)})));
 assert.equal(responses.filter(r=>r.status===201).length,3);assert.equal(responses.filter(r=>r.status===409).length,1);
 const saved=responses.find(r=>r.status===201).body.data;
 assert.ok(saved.recoveryKey);assert.equal(saved.siteName,'Lakeview Artificial Pond');
 const recovered=await request(`/bookings/${saved.reference}?key=${encodeURIComponent(saved.recoveryKey)}`);assert.equal(recovered.status,200);assert.equal(recovered.body.data.reference,saved.reference);
 const denied=await request(`/bookings/${saved.reference}?key=wrong`);assert.equal(denied.status,404);
 const pass=await request(`/bookings/${saved.reference}/pass?key=${encodeURIComponent(saved.recoveryKey)}`);assert.equal(pass.status,200);assert.ok(pass.body.data.qrPayload.includes(saved.reference));
 const help=await request('/assistance-requests',{method:'POST',body:JSON.stringify({bookingReference:saved.reference,category:'Senior citizen support'})});assert.equal(help.status,201);
 const status=await request(`/assistance-requests/${help.body.data.reference}`);assert.equal(status.body.data.status,'Received');
 await request('/demo/reset',{method:'POST',body:'{}'});
});
test('public sites carry labeled demo coordinates and never expose unsourced or invented status',async()=>{
 const {status,body}=await request('/sites');assert.equal(status,200);
 for(const s of body.data){
  assert.equal(s.coordinates.kind,'synthetic');assert.ok(Number.isFinite(s.coordinates.lat)&&Number.isFinite(s.coordinates.lng));
  assert.equal(s.provenance.kind,'demo');
  for(const raw of ['distance','waiting','wait','status','capacity'])assert.equal(raw in s,false,`${raw} must not be public`);
  assert.equal(s.statusInfo.freshness,'demo');assert.ok(s.statusInfo.source);assert.ok(Date.parse(s.statusInfo.observedAt));
 }
 const bengaluru=await request('/sites?q=Bengaluru');assert.equal(bengaluru.body.data.length,4);
});
test('operations site data is protected by a staff session',async()=>{
 const denied=await opsRequest('/operations/sites');assert.equal(denied.status,401);
 const session=await opsRequest('/operations/auth/session');assert.equal(session.status,200);assert.equal(session.body.data.authenticated,false);
 if(!process.env.OPS_USERNAME||!process.env.OPS_PASSWORD){const unavailableOrRejected=await opsRequest('/operations/auth/login',{method:'POST',body:JSON.stringify({username:'staff',password:'not-a-real-password'})});assert.ok([401,503].includes(unavailableOrRejected.status));return;}
 const rejected=await opsRequest('/operations/auth/login',{method:'POST',body:JSON.stringify({username:process.env.OPS_USERNAME,password:'wrong-password'})});assert.equal(rejected.status,401);
 const login=await opsRequest('/operations/auth/login',{method:'POST',body:JSON.stringify({username:process.env.OPS_USERNAME,password:process.env.OPS_PASSWORD})});assert.equal(login.status,200);assert.equal(login.body.data.role,'operations');
 const cookie=login.headers.get('set-cookie')?.split(';')[0];assert.match(cookie||'',/^visarjanops_ops=/);
 const allowed=await opsRequest('/operations/sites',{headers:{cookie}});assert.equal(allowed.status,200);assert.equal(allowed.body.data.length,8);
 const logout=await opsRequest('/operations/auth/logout',{method:'POST',headers:{cookie}});assert.equal(logout.status,200);
 const after=await opsRequest('/operations/sites',{headers:{cookie}});assert.equal(after.status,401);
});
