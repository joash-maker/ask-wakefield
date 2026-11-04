// Buying toys stays a retail request even when the shopper mentions children.
export const TOY_SHOP_LEADS=[{name:'Smyths Toys',url:'https://www.smythstoys.com/uk/en-gb/storefinder/storedetails/wakefield'},{name:'The Works',url:'https://www.theworks.co.uk/Store?storeId=0793'}];
export function isToyShoppingRequest(q){return /\b(?:toys?|lego|transformers|smyths)\b/i.test(q)&&/\b(?:buy|buying|get|need|want|shops?|stores?|where|smyths)\b/i.test(q)&&!/\b(?:playrooms?|soft play|playground|play with)\b/i.test(q);}
export function toyShoppingContinuation(q){return /\b(?:toys?|lego|transformers|smyths|those|these|their|they|other shops?|more shops?)\b/i.test(q)||/\b(?:ages?|aged|kids? are|children are)\b[^.!?]{0,25}\d|^\s*\d+\s*(?:and|&)\s*\d+/i.test(q);}
export const TOY_SHOPPING_GUIDANCE=`TOY SHOPPING: The user wants toys to take home, not a play outing. Keep the children's ages, toy brands and shopping area through follow-ups. Search actual current local shop pages and shopping-centre tenant pages, including specialist toy retailers before general craft shops. A brand question about Smyths must check its Wakefield store page directly, not suggest Leeds without looking. Return business rows with actual shop name, exact store URL, published address and literal product/range titles in services. A general retailer catalogue proves its range, not local stock. Never infer LEGO or Transformers stock at The Works or any store. Do not infer opening today, prices, age suitability, stock or branch presence from memory. Never suggest playrooms, parks, cinemas or snow slopes as toy shops. For other/more shops, find different retailers from the previous visible choices. Find up to six shop candidates; return exact source evidence. Named Smyths questions stay with Smyths.`;
export function renderToyShops(picks,messages,state){
 const q=String(messages.filter(m=>m.role==='user').at(-1)?.content||'');
 const named=/\bsmyths\b/i.test(q);
 const other=/\b(?:other|more)\b/i.test(q);
 const previous=state.constraints?.localSources||[];
 const shops=picks.filter(p=>!p.lead&&(!named||/smyths/i.test(p.name))&&(!other||!previous.some(s=>s.title===p.name))).slice(0,3);
 if(!shops.length)return null;
 const clean=s=>String(s||'').replace(/[<>\[\]*`\r\n]/g,' ').trim();
 const lines=shops.map((p,i)=>`${i===0?'I’d start with':'Another place to check is'} **${clean(p.name)}**${p.address?' at '+clean(p.address):''}. [Store details](${p.url})`);
 const brands=state.constraints?.requestFrame?.toyBrands||[];
 return {reply:(named?'Yes, I found a published Wakefield store page for Smyths.':'For toy shopping, '+(shops.length>1?'I’d look at these places:':'I could verify this shop:'))+'\n\n'+lines.join('\n\n')+'\n\n'+(brands.length?'For '+brands.join(' and ')+', check the exact item’s local stock before travelling. ':'')+'I haven’t confirmed live stock or today’s opening times.',sources:shops.map(p=>({title:p.name,url:p.url})),followups:[],live:true,verification:'toy-shopping-stores',state:{...state,lastIntent:'local.toy-shopping'}};
}
