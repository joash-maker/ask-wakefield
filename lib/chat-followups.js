// Keep suggestions within a finite set of supported, testable questions.
export function suggestedQuestions(question,answer='') {
  const q=String(question || '');
  if(!String(answer || '').trim())return [];
  if(/\b(?:bins?|parking|transport|council|local services?)\b/i.test(q))return ['Help me find my bin collection day','Help me find official parking information for Wakefield city centre','Help me plan a journey in Wakefield'];
  if(/\b(?:sports?|fitness|gyms?|swimming|running|athletics|padel)\b/i.test(q))return ['Find a running club in Wakefield','Help me find swimming lessons in Wakefield','Where can I play padel near Wakefield?'];
  if(/\b(?:clubs?|community|groups?|volunteering)\b/i.test(q))return ['Find a walking group near me in Wakefield','Find me a proper hiking or longer walking group around Wakefield','Tell me about Dad Matters and other parent support groups in Wakefield'];
  if(/\b(?:kids|children|families|family|indoor|rainy)\b/i.test(q))return ['Suggest indoor activities for a rainy day in the Wakefield district.','What free things can we do in Wakefield this weekend?','Help me find an activity in Wakefield'];
  if(/\b(?:coffee|caf[eé]s?|food|restaurants?)\b/i.test(q))return ['Where can I get coffee in Wakefield city centre?','Which coffee shops are open now in Wakefield city centre?'];
  return [];
}
