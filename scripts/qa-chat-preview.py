import json,sys,time,pathlib,urllib.request,urllib.parse,http.cookiejar,concurrent.futures,threading
cfg=json.load(sys.stdin)
class Redirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  if code in (307,308) and urllib.parse.urlsplit(req.full_url).netloc==urllib.parse.urlsplit(newurl).netloc:return urllib.request.Request(newurl,data=req.data,headers=dict(req.headers),method=req.method)
  return super().redirect_request(req,fp,code,msg,headers,newurl)
lock=threading.Lock();out=[]
rateLock=threading.Lock();nextStart=0
def run(case):
 opener=urllib.request.build_opener(Redirect(),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 messages=[];token=None;turns=[]
 global nextStart
 for q in case['turns']:
  with rateLock:
   wait=max(0,nextStart-time.monotonic());nextStart=max(nextStart,time.monotonic())+3.7
  if wait:time.sleep(wait)
  messages.append({'role':'user','content':q});started=time.time()
  req=urllib.request.Request(cfg['url']+'/api/chat?'+urllib.parse.urlencode({'_vercel_share':cfg['key']}),data=json.dumps({'messages':messages,'stateToken':token}).encode(),headers={'Content-Type':'application/json','Origin':'https://www.askwakefield.co.uk'},method='POST')
  try:
   with opener.open(req,timeout=115) as r: data=json.load(r);status=r.status
  except urllib.error.HTTPError as e:
   try:data=json.loads(e.read())
   except:data={'reply':'HTTP '+str(e.code)}
   status=e.code
  except Exception as e:data={'reply':'NETWORK '+type(e).__name__};status=0
  token=data.get('stateToken',token);reply=data.get('reply','');messages.append({'role':'assistant','content':reply})
  t={'question':q,'status':status,'seconds':round(time.time()-started,1),'reply':reply,'sources':data.get('sources',[]),'followups':data.get('followups'),'verification':data.get('verification'),'state':data.get('state')}
  if cfg.get('fetch_followups') and t['followups'] is None and reply:
   r=urllib.request.Request(cfg['url']+'/api/followups?'+urllib.parse.urlencode({'_vercel_share':cfg['key']}),data=json.dumps({'question':q,'answer':reply[:300]}).encode(),headers={'Content-Type':'application/json'},method='POST')
   try:
    with opener.open(r,timeout=25) as f:t['generatedFollowups']=json.load(f).get('followups',[])
   except Exception as e:t['generatedFollowupsError']=type(e).__name__
  turns.append(t)
 result={'id':case['id'],'label':case.get('label',case['id']),'turns':turns}
 with lock:
  out.append(result);pathlib.Path(cfg['output']).write_text(json.dumps(out,indent=2));print(json.dumps({'id':case['id'],'turns':len(turns),'status':[t['status'] for t in turns],'seconds':[t['seconds'] for t in turns],'verification':[t['verification'] for t in turns]}),flush=True)
 return result
cases=json.loads(pathlib.Path(cfg['cases']).read_text())
with concurrent.futures.ThreadPoolExecutor(max_workers=cfg.get('workers',3)) as pool:list(pool.map(run,cases))
print('Completed '+str(len(out))+' conversations, '+str(sum(len(c['turns']) for c in out))+' turns.',flush=True)
