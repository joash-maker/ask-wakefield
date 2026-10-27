import assert from 'node:assert/strict';
process.env.ANTHROPIC_API_KEY='test';process.env.GOOGLE_PLACES_ENABLED='false';
const user=content=>({role:'user',content});
let modelCalls=0,available=true,readCalls=0;
const urls=['https://www.bridgeinnwakefield.co.uk/vegetarian','https://www.corarima.co.uk/corarima-menu/'];
globalThis.fetch=async(url)=>{
 if(String(url).includes('anthropic.com')){modelCalls++;throw Error('No model needed for verified menu matches');}
 if(urls.includes(String(url))){
  readCalls++;
  if(!available)return new Response('Unavailable',{status:503});
  // Local identity can be in the footer. It must not be erased before the location check.
  return new Response(String(url)===urls[0]?'<html><head><title>Vegan & Vegetarian Pub Restaurant in Wakefield - The Bridge Inn</title></head><body><main><h1>Enjoy your vegetarian pub favourites</h1><p>Our vegetarian menu offers dishes for meat-free dining.</p></main><footer>Bridge Street, Wakefield WF1 5RT</footer></body></html>':'<html><head><title>Corarima Menu</title></head><body><main><h1>Menu</h1><p>Special vegan combination dishes.</p></main><footer>10 Cross Street, Wakefield WF1 3BW</footer></body></html>');
 }
 return new Response('Not found',{status:404});
};
const {default:handler}=await import('../api/chat.js');let counter=0;
async function ask(q,history=[]){
 const response={setHeader(){},status(n){this.code=n;return this;},json(body){this.body=body;return this;}};
 await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':'diet-paraphrase-'+(++counter)},socket:{},body:{messages:[...history,user(q)]}},response);
 assert.equal(response.code,200);return response.body;
}
const versions=['Where can we eat vegetarian food in Wakefield?','Which restaurants in Wakefield serve vegetarian options?',"What are Wakefield's best vegetarian restaurants?",'Can you suggest vegetarian restaurants in Wakefield?'];
const replies=[];
for(const q of versions){
 const r=await ask(q);assert.equal(r.verification,'dietary-menu-pages');replies.push(r);
 assert.match(r.reply,/The Bridge Inn/);assert.match(r.reply,/Corarima/);
 assert.doesNotMatch(r.reply,/menu matches|best-of ranking|Vegan & Vegetarian Pub Restaurant|open now|£/);
 assert.deepEqual(r.sources.map(s=>s.url),urls);
}
for(const r of replies)assert.equal(r.reply,replies[0].reply,'Equivalent requests must use the same verified menu set');
const follow=await ask(versions[1],[user(versions[0]),{role:'assistant',content:replies[0].reply}]);
assert.equal(follow.reply,replies[0].reply);
const vegan=await ask('Which vegan restaurants have menus in Wakefield?');
assert.doesNotMatch(vegan.reply,/The Bridge Inn/,'Vegetarian evidence alone is not vegan evidence');
assert.match(vegan.reply,/Corarima/);
assert.equal(modelCalls,0);assert.ok(readCalls>=versions.length*2,'Menu candidates must be read, not assumed from registration');
const {knownDietaryMenuAnswer}=await import('../lib/practical-answers.js');
for(const q of ['Vegetarian restaurants open tonight?','Vegetarian food under £20?','Vegetarian restaurants in Ossett?','Vegetarian restaurants on Saturday?','Vegetarian restaurants suitable for a nut allergy?','Vegetarian-only restaurants in Wakefield?'])assert.equal(await knownDietaryMenuAnswer([user(q)]),null,q);
available=false;
assert.equal(await knownDietaryMenuAnswer([user(versions[0])]),null,'An inaccessible candidate must fall through to discovery rather than be recommended');
console.log('Dietary paraphrases passed: identical first-party retrieval, footer addresses, clean names, vegan subset direction, constraints, fresh reads and no registry-only recommendations.');
