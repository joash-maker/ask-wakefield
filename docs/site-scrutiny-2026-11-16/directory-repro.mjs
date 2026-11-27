import fs from 'node:fs';import vm from 'node:vm';
const html=fs.readFileSync(process.cwd()+'/activities.html','utf8');
const source=html.slice(html.indexOf('  function categoryTokens('),html.indexOf('  function addCommunityCard('));
const ctx=vm.createContext({URL,location:{origin:'https://www.askwakefield.co.uk',hostname:'www.askwakefield.co.uk'}});vm.runInContext(source,ctx);
const results={unknownAge:ctx.ageTokens('Not specified'),paidWithFreeAssessment:ctx.priceToken('£25 per lesson, free assessment'),mondayToThursday:ctx.dayTokens('Mon–Thu after school'),performingArts:ctx.categoryTokens({category:'Drama & performing arts',audience:'Adults'}),unrelatedFacebookListingTreatedAsDuplicate:ctx.isDuplicateOfCurated({listingName:'A completely different club',facebook:'https://www.facebook.com/a-new-club'},{names:new Set(),hosts:new Set(['facebook.com'])})};
fs.writeFileSync('/tmp/aw-site-audit/directory-reproduction.json',JSON.stringify(results,null,2));console.log(results);
