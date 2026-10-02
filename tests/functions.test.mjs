// Prueba de las funciones reales con Netlify Blobs local y una API sintética aislada.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BlobsServer } from '@netlify/blobs/server';
import { setEnvironmentContext } from '@netlify/blobs';
import dashboard from '../netlify/functions/dashboard.mjs';
import planning from '../netlify/functions/planning.mjs';
import session from '../netlify/functions/session.mjs';
import { createSession } from '../netlify/functions/lib/auth.mjs';
test('Funciones con Blobs: consulta completa, caché, programación, seguimiento, conflicto y archivo',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'guardian-panel-test-'));
 const blobs=new BlobsServer({directory,logger:()=>{}});const address=await blobs.start();
 const fetchOriginal=globalThis.fetch;
 const originals={GUARDIAN_API_KEY:process.env.GUARDIAN_API_KEY,PANEL_ACCESS_PASSWORD:process.env.PANEL_ACCESS_PASSWORD,NETLIFY_BLOBS_CONTEXT:process.env.NETLIFY_BLOBS_CONTEXT};
 process.env.GUARDIAN_API_KEY='isolated-test-fixture';process.env.PANEL_ACCESS_PASSWORD='isolated-test-password-long';
 setEnvironmentContext({siteID:'isolated-test',token:'local-test',edgeURL:`http://127.0.0.1:${address.port}`,uncachedEdgeURL:`http://127.0.0.1:${address.port}`});
 let calls=0;
 globalThis.fetch=async(input,options)=>{
   const url=new URL(typeof input==='string'?input:input.url||input.toString());
   if(url.hostname==='us-central1-guardiancheck-prod.cloudfunctions.net'){
     calls++;const resource=url.pathname.split('/').at(-1);
     const rows=resource==='sites'?[{id:'site',name:'Sitio sintético',active:true}]:resource==='guards'?[{id:'guard',name:'Guardia sintético',accountActive:true}]:[];
     return Response.json({data:rows,nextCursor:null,generatedAt:new Date().toISOString()});
   }
   if(url.hostname!=='127.0.0.1')throw new Error('La prueba bloquea destinos externos.');
   return fetchOriginal(input,options);
 };
 const cookie=`gc_session=${createSession()}`;
 const req=(path,method='GET',body)=>new Request(`https://panel.example/api/${path}`,{method,headers:{Cookie:cookie,Origin:'https://panel.example',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 try {
   let response=await dashboard(req('dashboard'));assert.equal(response.status,200);let data=await response.json();assert.equal(data.sites[0].id,'site');assert.equal(calls,4);
   response=await dashboard(req('dashboard'));assert.equal(response.status,200);assert.equal(calls,4,'Cache compartida evita consultas repetidas');
   response=await planning(req('planning','POST',{siteId:'site',guardId:'guard',startAt:new Date(Date.now()+3600000).toISOString(),toleranceMinutes:5,responsible:'Supervisor de prueba'}));assert.equal(response.status,201,JSON.stringify(await response.clone().json()));const created=(await response.json()).data;
   data=await (await dashboard(req('dashboard'))).json();assert.equal(data.schedules.length,1);let p=data.schedules[0];assert.ok(p.etag);
   response=await planning(req('planning','PATCH',{id:p.id,etag:p.etag,kind:'contact',note:'Contacto manual de prueba'}));assert.equal(response.status,200);const updated=(await response.json()).data;assert.equal(updated.events.length,1);assert.ok(updated.events[0].at);
   response=await planning(req('planning','PATCH',{id:p.id,etag:p.etag,kind:'confirmed'}));assert.equal(response.status,409);
   response=await planning(req('planning','DELETE',{id:updated.id,etag:updated.etag}));assert.equal(response.status,200);
   data=await (await dashboard(req('dashboard'))).json();assert.equal(data.schedules.length,0);
   response=await session(req('session','POST',{password:process.env.PANEL_ACCESS_PASSWORD}),{ip:'test-ip'});assert.equal(response.status,200);assert.match(response.headers.get('set-cookie'),/Secure/);
   response=await session(req('session','DELETE'),{});assert.equal(response.status,200);assert.match(response.headers.get('set-cookie'),/Max-Age=0/);
   assert.equal(calls,4);
 } finally {
   globalThis.fetch=fetchOriginal;await blobs.stop();await rm(directory,{recursive:true,force:true});
   for(const [key,value] of Object.entries(originals)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
 }
});
