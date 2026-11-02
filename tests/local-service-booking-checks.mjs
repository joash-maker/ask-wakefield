import assert from 'node:assert/strict';
import {booksyProfileUrl,parseBooksyProfile,bookingRequest,readBooksyProfile} from '../lib/booking-business.js';
import {localServiceSearchAnswer} from '../lib/local-services.js';
import {scopeConversation} from '../lib/conversation-scope.js';
process.env.ANTHROPIC_API_KEY='test';process.env.GOOGLE_PLACES_ENABLED='false';process.env.OPENAI_FAILSAFE_ENABLED='false';
const url='https://booksy.com/en-gb/42942_gaffers-barbering_barber_1494632_wakefield';
const other='https://booksy.com/en-gb/55555_other-cuts_barber_1494632_wakefield';
const user=content=>({role:'user',content});
let price=18,mode='readable',calls=[],serial=0;
const page=()=>`<title>Gaffers Barbering - Wakefield</title><h1>Gaffers Barbering</h1><p>21 Northgate, WF1 3BJ, Wakefield</p><h2>Services</h2><h3>Popular Services</h3><h4>Gaffers Haircut</h4><div><span>£${price}.00</span><span>30min</span></div><h3>Other Services</h3><h3>Gaffers Haircut</h3><div>£${price}.00 30min</div><h3>Gaffers skinfade</h3><p>£21.00 30min</p><h3>Little gaffers</h3><p>£15.00 30min</p><h3>Hair cut + beard FROM</h3><p>£23.00+45min</p><h3>Beard trim with hot towel shave FROM</h3><p>£18.00+30min</p><h2>Reviews</h2><h3>Magic review-only shave</h3><p>£1.00</p><h2>Fresh finds nearby</h2><h3>Sponsored haircut</h3><p>£2.00</p>`;
const evidence='Gaffers Barbering. 21 Northgate, WF1 3BJ, Wakefield. Services: Gaffers Haircut; Gaffers skinfade; Beard trim with hot towel shave.';
globalThis.fetch=async(target,opts)=>{
 const u=String(target);calls.push({url:u,body:opts?.body?JSON.parse(opts.body):null});
 if(u.includes('anthropic.com')){
  const json={businesses:[{name:'Gaffers Barbering',url,address:'21 Northgate, WF1 3BJ, Wakefield',services:['Gaffers Haircut','Gaffers skinfade','Invented luxury treatment']}]};
  return new Response(JSON.stringify({content:mode==='no-search'?[{type:'text',text:'I cannot access external links.'}]:[{type:'web_search_tool_result',content:[]},{type:'text',text:'FINAL_RESPONSE: '+JSON.stringify(json),citations:[{url,title:'Gaffers Barbering - Wakefield - Booksy',cited_text:evidence}]}]}));
 }
 if(mode==='redirect')return new Response('',{status:302,headers:{location:other}});
 if(u===url&&mode!=='unreadable'&&mode!=='no-search')return new Response(page(),{headers:{'content-type':'text/html'}});
 return new Response('Unavailable',{status:403});
};
const profile=parseBooksyProfile(page(),url);assert.equal(profile.name,'Gaffers Barbering');assert.equal(profile.services.length,5);assert.equal(profile.services.find(s=>s.name==='Hair cut + beard').from,true);assert.doesNotMatch(JSON.stringify(profile),/Magic|Sponsored/);
assert.equal(parseBooksyProfile(page().replace('<h1>Gaffers Barbering','<h1>Other Cuts'),url),null);
for(const bad of ['http://booksy.com/en-gb/42942_gaffers-barbering','https://booksy.com.evil.test/en-gb/42942_gaffers-barbering','https://127.0.0.1/en-gb/42942_gaffers-barbering','https://booksy.com/en-gb/s/barber/wakefield','https://user:pass@booksy.com/en-gb/42942_gaffers-barbering'])assert.equal(booksyProfileUrl(bad),null);
const {default:handler}=await import('../api/chat.js');
async function ask(q,previous,rolling=false){
 const messages=[...(previous?.messages||[]),user(q)],res={setHeader(){},status(n){this.code=n;return this;},json(b){this.body=b;return this;}};
 await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':'service-booking-'+(++serial)},socket:{},body:{messages:rolling?messages.slice(-10):messages,stateToken:previous?.stateToken}},res);
 assert.equal(res.code,200,JSON.stringify(res.body));assert.doesNotMatch(res.body.reply,/I (?:can.?t|cannot|don.t have access).*external links|Google Maps or a quick walk|try a Google search|Invented luxury|Magic review|Sponsored haircut/i);
 return {...res.body,messages:[...messages,{role:'assistant',content:res.body.reply}]};
}
let answer=await ask("Where’s a good barber?");assert.equal(answer.verification,'local-service-search');assert.match(answer.reply,/Gaffers/);
const request=calls.find(c=>c.url.includes('anthropic.com')).body;assert.equal(request.tool_choice.type,'any');assert.equal(request.tools[0].allowed_domains,undefined);assert.match(request.system,/LOCAL BUSINESS DISCOVERY CONTRACT/);assert.doesNotMatch(request.system,/GROUNDED LOCAL PLACE SELECTION|choose only from the exact entity cards/);
answer=await ask("What's the best barber near city centre?",answer);assert.match(answer.reply,/Gaffers/);
answer=await ask('Gaffers?',answer);assert.match(answer.reply,/Gaffers/);assert.equal(answer.verification,'booking-business-page');
answer=await ask(url+'#ba_s=seo',answer);assert.equal(answer.verification,'booking-business-page');assert.equal(answer.sources[0].url,url);
answer=await ask('What services does Gaffers Barbering offer?',answer);assert.match(answer.reply,/Haircut|haircut/);assert.match(answer.reply,/hot towel shave/);assert.equal(answer.state.constraints.bookingBusiness.url,url);assert.doesNotMatch(answer.reply,/£18/,'Prices should be volunteered only when asked');
price=19;answer=await ask('What are the prices?',answer,true);assert.match(answer.reply,/£19.00/);assert.match(answer.reply,/from £23.00/);assert.equal(answer.sources.length,1);
for(const q of ['What services do they offer?','Any beard services?','What are the prices?']){answer=await ask(q,answer,true);assert.equal(answer.sources[0].url,url);assert.ok(answer.stateToken);}
const open=await ask('Are there any appointments today?',answer,true);assert.equal(open.verification,'booking-business-operational-unverified');assert.match(open.reply,/haven’t confirmed/);
assert.equal(bookingRequest([user('What services does Different Cuts offer?')],answer.state),null,'A different named business must not inherit Gaffers');
mode='unreadable';const fallback=await ask('What services does Gaffers Barbering offer?',answer,true);assert.equal(fallback.verification,'local-service-search');assert.match(fallback.reply,/Gaffers Haircut/);assert.match(fallback.reply,/search evidence/);assert.doesNotMatch(fallback.reply,/Invented luxury/);
mode='no-search';const failed=await ask(url);assert.equal(failed.verification,'local-service-unverified');assert.equal(failed.live,false);assert.equal(failed.sources.length,0);
mode='redirect';assert.equal(await readBooksyProfile(url),null);
const scoped=scopeConversation([...answer.messages,user('Where can we eat vegetarian food?')]);assert.equal(scoped.messages.length,1);
const swapped=localServiceSearchAnswer(JSON.stringify({businesses:[{name:'Other Cuts',url:other,services:['Cut']}]}),[{title:'Other Cuts',url:other}],[{url:other,text:'Other Cuts offers Cut'}],[user('What services does Gaffers Barbering offer?')],{},null);assert.equal(swapped,null);
const profileSource=[{title:'Gaffers Barbering - Wakefield - Booksy',url}];
const lead=localServiceSearchAnswer('Search results available, but formatting failed.',profileSource,[],[user('Good barber in Wakefield?')],{},null);assert.match(lead.reply,/Gaffers/);assert.doesNotMatch(lead.reply,/Gaffers Haircut|Beard trim/);
const wrapped=localServiceSearchAnswer('Result: '+JSON.stringify({businesses:[{name:'Gaffers Barbering',url,services:['Gaffers Haircut']} ]})+' End.',profileSource,[{url,text:evidence}],[user('Gaffers?')],{},null);assert.match(wrapped.reply,/Gaffers Haircut/);
assert.equal(localServiceSearchAnswer('No structured answer',[{title:'Wrong Name - Wakefield - Booksy',url}],[],[user('Gaffers?')],{},null),null);
mode='readable';const resolved=await ask('What services does Gaffers Barbering offer?');assert.equal(resolved.verification,'booking-business-page');assert.match(resolved.reply,/hot towel/);
const fresha='https://www.fresha.com/lvp/test-barber-wakefield-123';const directory=localServiceSearchAnswer(JSON.stringify({businesses:[{name:'Test Barber',url:fresha,services:['Unverified Beard Trimming']}]}),[{title:'Test Barber - Wakefield',url:fresha}],[{url:fresha,text:'Test Barber Wakefield. Unverified Beard Trimming.'}],[user('Good barber?')],{},null);assert.match(directory.reply,/Listing lead/);assert.doesNotMatch(directory.reply,/Unverified Beard Trimming/);
const cleared=localServiceSearchAnswer(JSON.stringify({businesses:[{name:'Other Cuts',url:other,services:[]}]}),[{title:'Other Cuts - Wakefield',url:other}],[{url:other,text:'Other Cuts Wakefield'}],[user('Other Cuts?')],answer.state,null);assert.ok(cleared);assert.equal(cleared.state.constraints.bookingBusiness.name,'Other Cuts');
const noSelected={constraints:{bookingBusiness:null}};assert.equal(bookingRequest([user(url),{role:'assistant',content:'Other local choices'},user('What are the prices?')],noSelected),null,'An old supplied link must not override a cleared current selection');
console.log('Local service and booking checks passed: full barber/Gaffers/link/services replay, forced discovery, direct page reads, exact source excerpts, price qualifiers, rolling signed context, name locking, missing evidence and isolated profile parsing.');
