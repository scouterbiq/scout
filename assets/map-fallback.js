// Layered geographic surfaces provide a lightweight CSS 3D fallback for non-WebGL devices.
const ANCHORS={'Johor':[103.35,1.95],'Kedah':[100.5,6.1],'Kelantan':[102.12,5.45],'Melaka':[102.25,2.25],'Negeri Sembilan':[102.15,2.85],'Pahang':[102.85,3.75],'Penang':[100.28,5.38],'Perak':[101.04,4.65],'Perlis':[100.2,6.48],'Sabah':[116.8,5.45],'Sarawak':[112.8,2.55],'Selangor':[101.4,3.45],'Terengganu':[103,5.05],'Kuala Lumpur':[101.69,3.14],'Labuan':[115.23,5.29],'Putrajaya':[101.69,2.93]};
export function createCssMap(counts,regularCounts){
 const stage=document.getElementById('map-stage'),hint=document.getElementById('map-hint');
 const rotate=document.getElementById('rotate-map'),reset=document.getElementById('reset-map');
 const tooltip=document.getElementById('map-tooltip');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const scene=document.createElement('div');scene.className='css-map-scene';
 const plane=document.createElement('div');plane.className='css-map-plane';scene.append(plane);
 for(let i=8;i>=0;i--){const layer=document.createElement('img');layer.src='assets/malaysia-fallback.svg';layer.alt='';layer.draggable=false;layer.className='css-map-layer';layer.style.transform=`translateZ(${-i*1.5}px)`;if(i)layer.style.filter='brightness(.58)';plane.append(layer);}
 const pins=document.createElement('div');pins.className='css-map-pins';plane.append(pins);stage.append(scene);
 let yaw=-7,tilt=31,auto=!reduced.matches,drag=null,moved=false,last=0,phase=0,lastFrame=0,visible=true;
 const transform=()=>{plane.style.transform=`rotateX(${tilt}deg) rotateZ(${yaw}deg)`;};
 function setAuto(value){auto=value;rotate.textContent=auto?'Ⅱ':'▶';rotate.setAttribute('aria-pressed',String(auto));rotate.setAttribute('aria-label',auto?'Pause map rotation':'Resume map rotation');}
 function setRegionCounts(next,nextRegular){counts=next;regularCounts=nextRegular;pins.replaceChildren();
  for(const [region,count] of counts){if(!ANCHORS[region])continue;const [lon,lat]=ANCHORS[region];
   const pin=document.createElement('a');pin.className='css-map-pin';pin.style.left=(((lon-99)*30+20)/650*100)+'%';pin.style.top=(((7.8-lat)*30+10)/220*100)+'%';
   const countRegular=regularCounts.get(region)||0;pin.href=`dashboard/scout.html?${new URLSearchParams({category:countRegular?'regular':'training',state:region})}`;
   pin.setAttribute('aria-label',`${region}: ${count} briefing leads. View ${countRegular?'regular SMEs':'training providers'}.`);
   const show=()=>{tooltip.textContent=`${region} · ${count} briefing leads`;tooltip.style.left='20px';tooltip.style.top='8px';tooltip.hidden=false;};
   pin.addEventListener('pointerenter',show);pin.addEventListener('focus',show);pin.addEventListener('pointerleave',()=>tooltip.hidden=true);pin.addEventListener('blur',()=>tooltip.hidden=true);
   pin.addEventListener('click',event=>{if(moved)event.preventDefault();});
   const dot=document.createElement('i');pin.append(dot);pins.append(pin);
  }
 }
 scene.addEventListener('pointerdown',event=>{if(event.button!==0)return;drag={x:event.clientX,y:event.clientY,yaw,tilt};moved=false;});
 scene.addEventListener('pointermove',event=>{if(!drag)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>6)moved=true;if(moved){yaw=Math.max(-28,Math.min(28,drag.yaw+dx*.12));tilt=Math.max(8,Math.min(52,drag.tilt-dy*.12));setAuto(false);transform();tooltip.hidden=true;}});
 window.addEventListener('pointerup',()=>{drag=null;});window.addEventListener('pointercancel',()=>{drag=null;});
 rotate.disabled=false;reset.disabled=false;setAuto(auto);
 rotate.addEventListener('click',()=>setAuto(!auto));reset.addEventListener('click',()=>{yaw=-7;tilt=31;transform();});
 reduced.addEventListener('change',()=>{if(reduced.matches)setAuto(false);});
 new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting;}).observe(stage);
 function frame(time){requestAnimationFrame(frame);if(document.hidden||!visible||time-lastFrame<32){last=time;return;}lastFrame=time;const dt=Math.min((time-(last||time))/1000,.05);last=time;if(auto&&!drag){phase+=dt*.2;yaw=-7+Math.sin(phase)*5;transform();}}
 setRegionCounts(counts,regularCounts);transform();stage.classList.add('css-ready');document.getElementById('map-fallback').hidden=true;
 hint.textContent='Drag to explore · click a cluster';requestAnimationFrame(frame);
 return {setRegionCounts};
}
