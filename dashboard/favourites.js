// Shared favourites stay in Training HQ; this device keeps a cache and pending changes.
(() => {
 'use strict';
 const ORIGIN='https://biq-training-hq.gillinterprise.chatgpt.site';
 const CHANNEL='biq-scout-favourites-v1';
 const CACHE_KEY='scout-favourites-cache-v1',QUEUE_KEY='scout-favourites-pending-v1';
 const key=value=>String(value||'').trim().toLowerCase();
 const matches=(a,b)=>String(a.leadId)===String(b.id)||(key(a.company)&&key(a.company)===key(b.company))||(key(a.domain)&&key(a.domain)===key(b.domain));
 const load=(name,fallback)=>{try{return JSON.parse(window.localStorage.getItem(name))??fallback;}catch{return fallback;}};
 window.createScoutFavouriteSync=function(onChange){
  let popup=null,connected=false,serial=0,syncing=false,storageFailed=false;
  let snapshot=load(CACHE_KEY,null);
  if(!Array.isArray(snapshot?.favourites))snapshot=null;
  const restored=load(QUEUE_KEY,[]);
  const queued=new Map((Array.isArray(restored)?restored:[]).filter(item=>item&&typeof item.id==='string'&&typeof item.favourite==='boolean').map(item=>[item.id,item]));
  const pending=new Map();
  let state='';
  const notify=()=>onChange?.();
  const isConnected=()=>!!(connected&&popup&&!popup.closed);
  const persist=()=>{try{window.localStorage.setItem(CACHE_KEY,JSON.stringify(snapshot));window.localStorage.setItem(QUEUE_KEY,JSON.stringify([...queued.values()]));storageFailed=false;}catch{storageFailed=true;}};
  function describe(){
   if(queued.size)return storageFailed?'Changes are only in this tab. Connect favourites to save them.':`${queued.size} ${queued.size===1?'change saved':'changes saved'} on this device — ${isConnected()?'waiting to sync.':'Connect favourites to sync with Training HQ.'}`;
   return isConnected()?'Synced with Training HQ':snapshot?'Showing saved favourites from this device. Connect to refresh.':'Star companies here. Connect favourites to sync with Training HQ.';
  }
  state=describe();
  function has(lead){const change=queued.get(String(lead.id));return change?change.favourite:!!snapshot?.favourites.some(f=>matches(f,lead));}
  function request(action,extra={}){
   return new Promise((resolve,reject)=>{
    if(!isConnected()){reject(new Error('Connect favourites to Training HQ to sync.'));return;}
    const requestId=String(Date.now())+'-'+(++serial);
    const timer=setTimeout(()=>{pending.delete(requestId);reject(new Error('Sync timed out. Pending changes have been kept.'));},20000);
    pending.set(requestId,{resolve,reject,timer});
    try{popup.postMessage({channel:CHANNEL,requestId,action,...extra},ORIGIN);}catch(error){clearTimeout(timer);pending.delete(requestId);reject(error);}
   });
  }
  async function sync(){
   if(syncing||!isConnected())return;
   syncing=true;state='Syncing favourites…';notify();
   try{
    await request('read');
    for(const change of [...queued.values()]){
     // Send the chosen state, so retrying an uncertain save cannot toggle it twice.
     await request('set',{leadId:change.id,favourite:change.favourite});
     if(queued.get(change.id)===change)queued.delete(change.id);
     persist();notify();
    }
    state=describe();
   }catch(error){state=error.message+' '+(queued.size?(storageFailed?'Keep this tab open; changes still need saving.':'Changes are saved on this device; reconnect to sync.'):'Try Connect favourites again.');}
   finally{syncing=false;notify();}
  }
  function connect(){
   if(popup&&!popup.closed){if(connected)sync();else popup.focus?.();return;}
   connected=false;
   // Only this explicit button action may open a connection window.
   popup=window.open(ORIGIN+'/scout-sync','biq-scout-favourites','popup,width=520,height=600');
   state=popup?'Connecting… use an approved BIQ account. Pending changes are kept.':'Allow the connection window, then click Connect favourites. Pending changes are kept.';
   notify();
  }
  window.addEventListener('message',event=>{
   if(event.origin!==ORIGIN||event.source!==popup||!popup||popup.closed)return;
   const message=event.data;if(!message||message.channel!==CHANNEL)return;
   if(message.type==='ready'){if(!connected){connected=true;sync();}return;}
   if(message.type!=='result'||!pending.has(message.requestId))return;
   const p=pending.get(message.requestId);clearTimeout(p.timer);pending.delete(message.requestId);
   if(!message.ok){p.reject(new Error(message.error||'Could not sync favourites'));return;}
   if(!Array.isArray(message.favourites)){p.reject(new Error('Invalid sync response'));return;}
   snapshot={favourites:message.favourites,checkedAt:message.checkedAt};persist();p.resolve(snapshot);notify();
  });
  setInterval(()=>{
   if(popup&&popup.closed){
    popup=null;connected=false;
    for(const p of pending.values()){clearTimeout(p.timer);p.reject(new Error('Connection closed.'));}pending.clear();
    state=describe();notify();
   }
  },1000);
  setInterval(()=>{if(isConnected()&&!syncing)sync();},30000);
  window.addEventListener('focus',()=>{if(isConnected()&&!syncing)sync();});
  return {has,connect,get state(){return state;},get loaded(){return !!snapshot||queued.size>0;},get connected(){return isConnected();},get busy(){return syncing;},toggle(lead){
   if(syncing||lead?.id==null)return;
   const id=String(lead.id),favourite=!has(lead);
   const original=!!snapshot?.favourites.some(f=>matches(f,lead));
   if(favourite===original)queued.delete(id);
   else queued.set(id,{id,company:lead.company||'',domain:lead.domain||'',favourite});
   persist();state=describe();notify();
   if(isConnected())sync();
  }};
 };
})();
