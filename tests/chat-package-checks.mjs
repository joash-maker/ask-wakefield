import assert from "node:assert/strict";
import {
  mkdtempSync,
  copyFileSync,
  mkdirSync,
  symlinkSync,
  writeFileSync,
  rmSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = fileURLToPath(new URL("../", import.meta.url));
// Verify that Vercel receives the build inputs, not just that they exist in
// the checkout. The previous scripts/ exclusion hid the build entry.
const inputs = [
  "api/chat.js",
  "scripts/build-chat.mjs",
  "lib/chat/runtime-entry.ts",
  "lib/chat/pipeline.ts",
];
const ignored = spawnSync(
  "git",
  [
    "-c",
    "core.excludesFile=" + join(root, ".vercelignore"),
    "check-ignore",
    "--no-index",
    "--stdin",
  ],
  { cwd: root, encoding: "utf8", input: inputs.join("\n") + "\n" },
);
assert.equal(
  ignored.status,
  1,
  "Deployment input excluded: " + ignored.stdout + ignored.stderr,
);
const isolated = mkdtempSync(join(tmpdir(), "aw-package-"));
try {
  mkdirSync(join(isolated, "api"));
  mkdirSync(join(isolated, "lib/chat"), { recursive: true });
  copyFileSync(join(root, "api/chat.js"), join(isolated, "api/chat.js"));
  copyFileSync(
    join(root, "lib/chat/runtime.js"),
    join(isolated, "lib/chat/runtime.js"),
  );
  writeFileSync(
    join(isolated, "package.json"),
    JSON.stringify({ type: "module" }),
  );
  symlinkSync(
    join(root, "node_modules"),
    join(isolated, "node_modules"),
    "dir",
  );
  const config = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
  assert.equal(config.buildCommand, "npm run build:chat");
  assert.equal(config.outputDirectory,".");
  assert.equal(
    config.functions["api/chat.js"].includeFiles,
    "lib/chat/runtime.js",
  );
  const script = `
 import assert from 'node:assert/strict';
 import {createServer} from 'node:http';
 const RealDate=Date;
 globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:['2026-11-26T10:00:00Z']));}static now(){return RealDate.parse('2026-11-26T10:00:00Z');}};
 process.env.ANTHROPIC_API_KEY='fixture';process.env.GOOGLE_PLACES_ENABLED='false';process.env.AW_EVENT_CATALOGUE_ENABLED='false';
 const httpFetch=globalThis.fetch;
 const eventUrl='https://experiencewakefield.co.uk/event/package-evening/';
 globalThis.fetch=async url=>{
  if(String(url).includes('anthropic.com'))throw Error('No model should run during packaged event discovery');
  if(String(url)==='https://experiencewakefield.co.uk/whats-on/')return new Response('<h3><a href="'+eventUrl+'">Packaged Evening Event</a></h3><p>Calendar Sat 28 November 2026</p><p>Clock 17:00 - 21:00</p><p>Map pin WX Wakefield Exchange</p>');
  return new Response('Not found',{status:404});
 };
 const {default:handler}=await import('./api/chat.js');
 const server=createServer(async(req,res)=>{
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  req.body=chunks.length?JSON.parse(Buffer.concat(chunks)):{};
  res.status=function(code){this.statusCode=code;return this;};
  res.json=function(body){this.setHeader('Content-Type','application/json');this.end(JSON.stringify(body));return this;};
  await handler(req,res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const endpoint='http://127.0.0.1:'+server.address().port+'/api/chat';
  const ask=async(question,stateToken=null)=>{
   const response=await httpFetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:question}],stateToken})});
   assert.equal(response.status,200);assert.equal(response.headers.get('X-AskWakefield-Pipeline'),'unified-v1');
   const body=await response.json();assert(body.reply);assert(body.stateToken);assert(body.sources.some(s=>s.url===eventUrl));return body;
  };
  const first=await ask("What's on this week in Wakefield?");
  assert.match(first.reply,/Packaged Evening Event/);assert.match(first.reply,/Saturday 28 November 2026/);
  const second=await ask('What about Saturday?',first.stateToken);assert.match(second.reply,/Packaged Evening Event/);assert.equal(second.state.weekday,'saturday');
  const method=await httpFetch(endpoint);assert.equal(method.status,405);
  const invalid=await httpFetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(invalid.status,400);
  console.log('Packaged HTTP checks passed without any TypeScript source or type stripping: weekly discovery, signed follow-up, method and payload validation.');
 }finally{await new Promise(resolve=>server.close(resolve));}
 `;
  writeFileSync(join(isolated, "check.mjs"), script);
  const result = spawnSync(
    process.execPath,
    ["--no-experimental-strip-types", "check.mjs"],
    { cwd: isolated, encoding: "utf8", timeout: 30000 },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
  process.stdout.write(result.stdout);
} finally {
  rmSync(isolated, { recursive: true, force: true });
}
