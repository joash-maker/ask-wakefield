import assert from 'node:assert/strict';
import {GUIDE_VOICE} from '../lib/guide-voice.js';
process.env.ANTHROPIC_API_KEY='test';
process.env.GOOGLE_PLACES_ENABLED='false';
process.env.OPENAI_FAILSAFE_ENABLED='false';
const requests=[];
globalThis.fetch=async(url,options)=>{
 if(String(url).includes('api.anthropic.com')){
  requests.push(JSON.parse(options.body));
  return new Response(JSON.stringify({content:[{type:'web_search_tool_result',content:[]},{type:'text',text:'FINAL_RESPONSE: Check the published programme before choosing a session.',citations:[{type:'web_search_result_location',url:'https://www.wakefield.gov.uk/',title:'Wakefield Council',cited_text:'Published local information.'}]}]}));
 }
 return new Response('Unavailable',{status:404});
};
const {default:handler}=await import('../api/chat.js');
let serial=0;
async function ask(messages){
 const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
 const before=requests.length;
 await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':'guide-voice-'+(++serial)},socket:{},body:{messages}},res);
 assert.equal(res.code,200);
 assert.ok(requests.length>before,'This request must exercise the actual model transport');
 const request=requests.slice(before).find(r=>r.system?.includes(GUIDE_VOICE));
 assert.ok(request,'Public answer generation must receive the shared guide voice');
 assert.doesNotMatch(request.system,/MUST give 3-5|Give 3-5 options|Give 3-5 sensible/,'Later task guidance must not override the shorter shortlist');
 return request;
}
const user=content=>({role:'user',content});
await ask([user('What local walking groups can I join in Wakefield?')]);
await ask([user('Can you suggest somewhere interesting to visit in Wakefield?')]);
const followup=await ask([user('We have two children aged 5 and 8 and want somewhere indoors in Wakefield.'),{role:'assistant',content:'Wakefield Museum and Wakefield Library are different indoor options.'},user('How do those two differ?')]);
const history=JSON.stringify(followup.messages);
assert.match(history,/two children aged 5 and 8/);
assert.match(history,/How do those two differ/);
// This checks instruction delivery and retained context, not the quality of a mocked model's prose.
console.log('Guide voice transport checks passed: groups, general discovery, contextual follow-ups and no conflicting shortlist instructions.');
