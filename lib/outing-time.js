const numbers={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12};
const hour=value=>numbers[value.toLowerCase()] ?? Number(value);
// British clock wording is interpreted from the actual utterance. Model
// output cannot supply an invented time or override an explicit AM/PM.
export function outingTime(question, evening=true) {
  const q=String(question).toLowerCase();
  if (/\bmidnight\b/.test(q)) return 1440;
  if (/\bnoon\b|\bmidday\b/.test(q)) return 720;
  const digit=q.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/)
    || q.match(/\b(?:at|after|around|by|about)\s+(\d{1,2})(?::(\d{2}))?\b/)
    || q.match(/^\s*(\d{1,2}):(\d{2})\s*[?.!]*$/);
  let h,m=0,meridiem;
  if(digit){h=+digit[1];m=+(digit[2]||0);meridiem=digit[3];}
  else {
    const word='(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|[1-9]|1[0-2])';
    let match=q.match(new RegExp('\\bhalf(?:\\s+past)?\\s+'+word+'\\b'));
    if(match){h=hour(match[1]);m=30;}
    else if((match=q.match(new RegExp('\\bquarter\\s+(past|to)\\s+'+word+'\\b')))){
      h=hour(match[2]);m=match[1]==='past'?15:45;if(match[1]==='to')h=h===1?12:h-1;
    } else if((match=q.match(new RegExp('\\b'+word+'\\s+(thirty|fifteen|forty five|forty-five|o.clock)\\b')))){
      h=hour(match[1]);m=match[2]==='thirty'?30:match[2]==='fifteen'?15:/forty/.test(match[2])?45:0;
    } else return null;
    meridiem=q.match(/\b(am|pm)\b/)?.[1];
  }
  if(!Number.isFinite(h)||h>23||m>59||meridiem&&(h<1||h>12))return null;
  if(meridiem)h=h%12+(meridiem==='pm'?12:0);
  else if(evening&&h<12)h+=12;
  return h*60+m;
}
