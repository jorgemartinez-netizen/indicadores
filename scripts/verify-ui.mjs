// Prueba de interfaz aislada: nunca accede a GuardianCheck. Los fixtures son explícitamente sintéticos.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const baseURL=process.env.PANEL_TEST_URL||'http://127.0.0.1:8888';
const output=new URL('../output/',import.meta.url);await mkdir(output,{recursive:true});
const browser=await chromium.launch({...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1512,height:1050}});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto(baseURL);await page.getByRole('heading',{name:'Acceso al panel'}).waitFor();
 await page.screenshot({path:new URL('login.png',output).pathname,fullPage:true});
 let writes=0;
 const now=Date.now();
 const dateStr=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 let fixture={sites:[{id:'test-site',name:'Servicio de prueba',active:true}],guards:[{id:'test-guard',name:'Guardia de prueba',accountActive:true}],onDuty:[],shifts:[],schedules:[],range:{from:dateStr,to:dateStr},sourceTimes:[new Date(now).toISOString()],fetchedAt:new Date(now).toISOString()};
 await page.route('**/api/**',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.pathname==='/api/session'){await route.fulfill({json:{authenticated:true}});return;}
   if(url.pathname==='/api/dashboard'){await route.fulfill({json:fixture});return;}
   if(url.pathname==='/api/planning'){writes++;const body=request.postDataJSON();assert.equal(body.guardId,'test-guard');assert.equal(body.siteId,'test-site');assert.match(body.startAt,/Z$/);fixture={...fixture,schedules:[{...body,id:'test-plan',createdAt:new Date().toISOString(),etag:'test-etag',events:[]}]};await route.fulfill({status:201,json:{data:fixture.schedules[0]}});return;}
   await route.abort();
 });
 await page.reload();await page.getByRole('heading',{name:'Control de operación',exact:true}).waitFor();
 await page.getByText('API conectada',{exact:true}).waitFor();
 await page.addStyleTag({content:'body::after{content:"PRUEBA VISUAL · DATOS SINTÉTICOS";position:fixed;bottom:5px;left:50%;transform:translateX(-50%);background:#674b20;color:#fff;padding:6px 12px;font-size:10px;z-index:100;pointer-events:none;}'});
 await page.screenshot({path:new URL('panel-empty-desktop.png',output).pathname,fullPage:true});
 assert.equal(await page.getByText('80%',{exact:true}).count(),0);
 await page.getByRole('button',{name:'Anticipación',exact:true}).click();await page.getByRole('button',{name:'Programar entrada'}).click();
 await page.getByLabel('Guardia',{exact:true}).selectOption('test-guard');await page.getByLabel('Responsable de seguimiento').fill('Supervisor de prueba');await page.getByRole('button',{name:'Guardar',exact:true}).click();
 await page.getByText('Seguimiento guardado.',{exact:true}).waitFor();assert.equal(writes,1);await page.getByText('Guardia de prueba',{exact:true}).first().waitFor();
 await page.getByRole('button',{name:'Operación diaria',exact:true}).click();await page.getByRole('heading',{name:'Turnos abiertos',exact:true}).waitFor();
 await page.getByRole('button',{name:'Indicadores',exact:true}).click();await page.getByRole('heading',{name:'Indicadores de anticipación',exact:true}).waitFor();
 await page.getByRole('button',{name:'Historial',exact:true}).click();await page.getByLabel('Buscar turno').fill('no existe');await page.getByText('No hay registros para esta selección.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Configuración',exact:true}).click();await page.getByRole('heading',{name:'Estado de la conexión',exact:true}).waitFor();
 await page.getByRole('button',{name:'Resumen',exact:true}).click();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:new URL('panel-empty-mobile.png',output).pathname,fullPage:true});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);assert.equal(overflow,false,'No debe haber desbordamiento horizontal en móvil');
 await page.getByRole('button',{name:'Anticipación',exact:true}).click();await page.getByRole('button',{name:'Registrar',exact:true}).first().click();await page.getByRole('heading',{name:'Registrar aviso o relevo',exact:true}).waitFor();await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);
 assert.deepEqual(errors,[]);
 console.log('UI: login, estados vacíos, navegación, programación, modal y móvil: OK. Fixtures sintéticos; sin consultas reales.');
} finally {await browser.close();}
