// The shortlist lives in the private BIQ workspace, never in public GitHub data.
(() => {
 'use strict';
 const ORIGIN='https://biq-training-hq.gillinterprise.chatgpt.site';
 const CHANNEL='biq-scout-favourites-v1';
 window.createScoutFavouriteSync=function(onChange){
  let popup=null,connected=false,snapshot=null,state='Not connected',serial=0;
  const pending=new Map(),queued=new Map();
  const notify=()=>onChange?.();
  const key=name=>String(name||'').trim().toLowerCase();
  function has(lead){return !!snapshot?.favourites?.some(f=>f.leadId===lead.id||key(f.company)===key(lead.company)||(f.domain&&lead.domain&&key(f.domain)===key(lead.domain)));}
  function request(action,extra={}){return new Promise((resolve,reject)=>{if(!popup||popup.closed||!connected){reject(new Error('Connect favourites to Training HQ first.'));return;}const requestId=String(Date.now())+'-'+(++serial);const timer=setTimeout(()=>{pending.delete(requestId);reject(new Error('Sync timed out. Your saved favourites have been kept.'));},20000);pending.set(requestId,{resolve,reject,timer});popup.postMessage({channel:CHANNEL,requestId,action,...extra},ORIGIN);});}
  async function refresh(){try{await request('read');state='Synced with Training HQ';}catch(e){state=e.message;}notify();}
  async function flush(){const work=[...queued.values()];queued.clear();for(const lead of work){try{await request('set',{leadId:lead.id,favourite:!has(lead)});state='Favourite saved in Training HQ';}catch(e){state=e.message;}finally{notify();}}}
  function connect(){if(popup&&!popup.closed&&connected){refresh();return;}popup=window.open(ORIGIN+'/scout-sync','biq-scout-favourites','popup,width=520,height=600');if(!popup){state='Allow the connection window, then try Connect favourites again.';queued.clear();notify();return;}state='Connecting… use an approved BIQ account';notify();}
  window.addEventListener('message',async event=>{if(event.origin!==ORIGIN||event.source!==popup)return;const message=event.data;if(!message||message.channel!==CHANNEL)return;if(message.type==='ready'){if(connected)return;connected=true;try{await request('read');state='Synced with Training HQ';notify();await flush();}catch(e){state=e.message;queued.clear();notify();}return;}if(message.type!=='result'||!pending.has(message.requestId))return;const p=pending.get(message.requestId);clearTimeout(p.timer);pending.delete(message.requestId);if(!message.ok){p.reject(new Error(message.error||'Could not sync favourites'));return;}if(!Array.isArray(message.favourites)){p.reject(new Error('Invalid sync response'));return;}snapshot={favourites:message.favourites,checkedAt:message.checkedAt};p.resolve(snapshot);notify();});
  setInterval(()=>{if(popup&&popup.closed){popup=null;connected=false;state='Connection closed — reconnect to refresh favourites';queued.clear();for(const p of pending.values()){clearTimeout(p.timer);p.reject(new Error('Connection closed. Reconnect to try again.'));}pending.clear();notify();}},1000);
  setInterval(()=>{if(connected&&popup&&!popup.closed&&!pending.size)refresh();},30000);
  window.addEventListener('focus',()=>{if(connected&&popup&&!popup.closed&&!pending.size)refresh();});
  return {has,connect,get state(){return state;},get loaded(){return !!snapshot;},get connected(){return connected;},get busy(){return pending.size>0||queued.size>0;},toggle(lead){if(this.busy)return;if(connected&&popup&&!popup.closed){queued.set(lead.id,lead);flush();}else{queued.set(lead.id,lead);connect();}}};
 };
})();
