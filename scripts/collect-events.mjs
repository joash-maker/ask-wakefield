// Read-only source smoke test. No production credentials or writes are used.
import {collectSource} from '../lib/events/collector.js';
import {getSource} from '../lib/events/sources.js';
const id=process.argv[2];if(!getSource(id)){console.error('Usage: node scripts/collect-events.mjs <registered-source-id>');process.exit(1);}
const pageArg=process.argv.find(s=>s.startsWith('--pages='));if(pageArg)getSource(id).maxPages=Math.max(1,Math.min(12,Number(pageArg.split('=')[1])||3));
let result;const store={async load(){return {events:[],runs:[],reviews:[]};},async saveRun(run,events){result={run,events};}};
await collectSource(id,{store});
console.log(JSON.stringify(result,null,2));if(result.run.status==='failed')process.exitCode=1;
