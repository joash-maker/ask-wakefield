import assert from 'node:assert/strict';
import {chatNavigation} from '../lib/chat-navigation.js';
const firstQuestion='What can I do on a rainy day in Wakefield?';
const secondQuestion='Anything in the Wakefield city centre to do with ample parking, too.';
const first=chatNavigation(firstQuestion);
assert.equal(first.state.constraints.indoorGuide,true);
assert.doesNotMatch(first.reply,/How old are the children/,'Do not assume children on a general rainy-day request');
const second=chatNavigation(secondQuestion,first.state);
assert.match(second.reply,/Wakefield Museum/);assert.match(second.reply,/Wakefield Library/);assert.match(second.reply,/Merchant Gate/);
assert.doesNotMatch(second.reply,/Castleford|Xscape|Sculpture Park|The Hepworth/,'Keep a city-centre refinement in the city centre');
assert.doesNotMatch(second.reply,/two hours free|guaranteed spaces|ample parking is available|open today/);
assert.equal(second.state.constraints.indoorParking,true);assert.equal(second.state.constraints.indoorArea,'Wakefield city centre');
assert.equal(second.sources.length,3);
const legacy=chatNavigation(secondQuestion,{lastIntent:'other'},[{role:'user',content:firstQuestion},{role:'assistant',content:'Some indoor ideas.'},{role:'user',content:secondQuestion}]);
assert.match(legacy.reply,/Wakefield Museum/);assert.match(legacy.reply,/Merchant Gate/,'Recover the immediate rainy-day request from a pre-fix conversation');
assert.equal(chatNavigation("What's on this weekend?",second.state),null);
assert.equal(chatNavigation('How do I report a pothole?',second.state),null);
assert.equal(chatNavigation('What is the weather tomorrow?',second.state),null);
assert.match(chatNavigation('Help me find official parking information for Wakefield city centre').reply,/Where in the city centre/);
// Exercise the complete client → signed state → handler flow without paid lookups.
process.env.ANTHROPIC_API_KEY='test';process.env.GOOGLE_PLACES_ENABLED='false';
let network=0;globalThis.fetch=async()=>{network++;throw Error('Rainy-day navigation should use reviewed official references')};
const {default:handler}=await import('../api/chat.js');let history=[],token=null;
for(const [i,q] of [firstQuestion,secondQuestion].entries()){
 history.push({role:'user',content:q});const res={setHeader(){},status(c){this.code=c;return this},json(b){this.body=b;return this}};
 await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':'rainy-parking-'+i},socket:{},body:{messages:history,stateToken:token}},res);
 assert.equal(res.code,200);assert.equal(res.body.verification,'local-navigation-v1');assert(res.body.stateToken);
 token=res.body.stateToken;history.push({role:'assistant',content:res.body.reply});
 if(i===1){assert.match(res.body.reply,/Wakefield Museum/);assert.match(res.body.reply,/Merchant Gate/);assert.equal(res.body.state.constraints.indoorArea,'Wakefield city centre');}
}
assert.equal(network,0);
console.log('Rainy-day continuity passed: natural opening, city-centre + parking refinement, legacy context, topic escape, no invented spaces and signed-state handler flow.');
