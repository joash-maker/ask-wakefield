import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const regressions=readdirSync(new URL('../tests/',import.meta.url)).filter(name=>name.endsWith('.mjs')).sort().map(name=>'tests/'+name);
const regressionOnly=process.argv.includes('--regression-only');
const files=regressionOnly?regressions:[...regressions,'scripts/audit-chat-contracts.mjs'];
let passed=0,failed=0;
for(const file of files){
 const r=spawnSync(process.execPath,[file],{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:2_000_000});
 const ok=r.status===0&&!r.error;
 if(ok)passed++;else failed++;
 console.log(`${ok?'PASS':'FAIL'} ${file}`);
 if(!ok)console.log((r.error?.message||'')+'\n'+(r.stdout+r.stderr).slice(-5000));
}
console.log(`${passed} passed; ${failed} failed.${regressionOnly?' Regression-only run: acceptance contracts were not checked.':''}`);
process.exitCode=failed?1:0;
