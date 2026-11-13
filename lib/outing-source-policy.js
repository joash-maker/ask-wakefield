export function scoutUrl(value) {
  try {
    const u=new URL(value);
    if(u.protocol!=='https:' || u.username || u.password || u.port || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname)
      || /(?:^|\.)(?:localhost|local|internal|test|example|invalid)$/i.test(u.hostname)
      || /^\d+(?:\.\d+){3}$/.test(u.hostname)) return null;
    return u.href;
  } catch { return null; }
}

