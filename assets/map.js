// Geographic meshes use Natural Earth public-domain country boundaries.
// Markers aggregate listed company locations at approximate state/territory anchors.
import * as THREE from './vendor/three.module.min.js';
import { createCssMap } from './map-fallback.js';
const ANCHORS = {
 'Johor':[103.35,1.95],'Kedah':[100.5,6.1],'Kelantan':[102.12,5.45],
 'Melaka':[102.25,2.25],'Negeri Sembilan':[102.15,2.85],'Pahang':[102.85,3.75],
 'Penang':[100.28,5.38],'Perak':[101.04,4.65],'Perlis':[100.2,6.48],
 'Sabah':[116.8,5.45],'Sarawak':[112.8,2.55],'Selangor':[101.4,3.45],
 'Terengganu':[103.0,5.05],'Kuala Lumpur':[101.69,3.14],
 'Labuan':[115.23,5.29],'Putrajaya':[101.69,2.93]
};
export async function createMap(initialCounts,initialRegularCounts) {
 const stage=document.getElementById('map-stage'), hint=document.getElementById('map-hint');
 const rotate=document.getElementById('rotate-map'), reset=document.getElementById('reset-map');
 const tooltip=document.getElementById('map-tooltip');
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 let renderer;
 try { renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'}); }
 catch { return createCssMap(initialCounts,initialRegularCounts); }
 renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,1.6));
 renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.domElement.setAttribute('aria-label','Drag to rotate Malaysia. Click a lead cluster to view regular SMEs in that area.');
 renderer.domElement.setAttribute('aria-hidden','true');
 stage.append(renderer.domElement);
 const scene=new THREE.Scene();
 const camera=new THREE.OrthographicCamera(-12.5,12.5,7,-7,.1,150);
 camera.position.set(0,17.5,17);camera.lookAt(0,0,0);
 scene.add(new THREE.AmbientLight(0xb8d8ff,2.2));
 const key=new THREE.DirectionalLight(0x99c5ff,3.7);key.position.set(-7,13,9);scene.add(key);
 const rim=new THREE.DirectionalLight(0x4d8dff,2);rim.position.set(9,5,-9);scene.add(rim);
 const world=new THREE.Group();scene.add(world);world.rotation.y=-.08;
 const project=([lon,lat],height=0)=>new THREE.Vector3((lon-109.55)*1.13,height,-(lat-4.1)*1.13);
 const response=await fetch('assets/malaysia.json');
 if(!response.ok) throw new Error('Map outline unavailable');
 const geo=await response.json();
 const topMaterial=new THREE.MeshStandardMaterial({color:0x32669b,roughness:.68,metalness:.35});
 const sideMaterial=new THREE.MeshStandardMaterial({color:0x123b67,roughness:.6,metalness:.4});
 for (const polygon of geo.coordinates) {
  const shape=new THREE.Shape();
  polygon[0].forEach((point,i)=>{const p=project(point);if(i===0)shape.moveTo(p.x,-p.z);else shape.lineTo(p.x,-p.z);});
  for(const ring of polygon.slice(1)){
   const path=new THREE.Path();ring.forEach((point,i)=>{const p=project(point);if(i===0)path.moveTo(p.x,-p.z);else path.lineTo(p.x,-p.z);});shape.holes.push(path);
  }
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.44,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,steps:1,curveSegments:2});
  const mesh=new THREE.Mesh(geometry,[topMaterial,sideMaterial]);mesh.rotation.x=-Math.PI/2;world.add(mesh);
  const outlinePoints=polygon[0].map(point=>project(point,.47));
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(outlinePoints),new THREE.LineBasicMaterial({color:0x6caff0,transparent:true,opacity:.65}));world.add(line);
 }
 const grid=new THREE.GridHelper(32,32,0x42678f,0x2d496b);grid.position.y=-.28;grid.material.transparent=true;grid.material.opacity=.16;world.add(grid);
 const markerGroup=new THREE.Group();world.add(markerGroup);
 let counts=initialCounts, regularCounts=initialRegularCounts, clickable=[], halos=[];
 function setRegionCounts(next,nextRegular){
  counts=next;regularCounts=nextRegular;
  while(markerGroup.children.length){const child=markerGroup.children[0];markerGroup.remove(child);child.geometry?.dispose();if(Array.isArray(child.material))child.material.forEach(m=>m.dispose());else child.material?.dispose();}
  clickable=[];halos=[];
  for(const [region,count] of counts){
   if(!ANCHORS[region])continue;
   const base=project(ANCHORS[region],.5), height=.28+Math.min(1.5,Math.sqrt(count)*.13);
   const column=new THREE.Mesh(new THREE.CylinderGeometry(.027,.045,height,8),new THREE.MeshBasicMaterial({color:0x77b5ff,transparent:true,opacity:.7}));column.position.copy(base);column.position.y+=height/2;markerGroup.add(column);
   const sphere=new THREE.Mesh(new THREE.SphereGeometry(.095+Math.min(.07,count*.002),12,10),new THREE.MeshBasicMaterial({color:0xb9e2ff}));sphere.position.copy(base);sphere.position.y+=height;sphere.userData={region,count};markerGroup.add(sphere);clickable.push(sphere);
   const halo=new THREE.Mesh(new THREE.RingGeometry(.16,.21,28),new THREE.MeshBasicMaterial({color:0x529dff,transparent:true,opacity:.5,side:THREE.DoubleSide}));halo.rotation.x=-Math.PI/2;halo.position.copy(base);halo.position.y=.49;markerGroup.add(halo);halos.push(halo);
   const hit=new THREE.Mesh(new THREE.SphereGeometry(.29,8,6),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));hit.position.copy(sphere.position);hit.userData={region,count};markerGroup.add(hit);clickable.push(hit);
  }
 }
 setRegionCounts(counts,regularCounts);
 let direction=1;
 let yaw=-.08,tilt=0,drag=null,moved=false,hover=null,auto=!reduced.matches,last=0,lastFrame=0,visible=true,frameId;
 function resize(){const {width,height}=stage.getBoundingClientRect();if(!width||!height)return;const aspect=width/height;const halfW=Math.max(12.1,8.5*aspect);camera.left=-halfW;camera.right=halfW;camera.top=halfW/aspect;camera.bottom=-halfW/aspect;camera.updateProjectionMatrix();renderer.setSize(width,height,false);renderOnce();}
 const observer=new ResizeObserver(resize);observer.observe(stage);
 const visibility=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting;});visibility.observe(stage);
 const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2();
 function target(event){const rect=renderer.domElement.getBoundingClientRect();pointer.set(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(clickable)[0]?.object.userData || null;}
 renderer.domElement.addEventListener('pointerdown',event=>{if(event.button!==0)return;drag={x:event.clientX,y:event.clientY,yaw,tilt};moved=false;});
 renderer.domElement.addEventListener('pointermove',event=>{
  if(drag){const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>6)moved=true;if(moved){yaw=THREE.MathUtils.clamp(drag.yaw+dx*.004,-.65,.65);tilt=THREE.MathUtils.clamp(drag.tilt+dy*.0025,-.12,.28);setAuto(false);tooltip.hidden=true;world.rotation.set(tilt,yaw,0);renderOnce();}return;}
  hover=target(event);stage.style.cursor=hover?'pointer':'grab';
  if(hover){tooltip.textContent=`${hover.region} · ${hover.count} briefing leads · ${regularCounts.get(hover.region)||0} regular SMEs`;tooltip.style.left=Math.min(Math.max(8,event.clientX-stage.getBoundingClientRect().left-65),Math.max(8,stage.clientWidth-225))+'px';tooltip.style.top=Math.max(4,event.clientY-stage.getBoundingClientRect().top-50)+'px';tooltip.hidden=false;}
  else tooltip.hidden=true;
 });
 window.addEventListener('pointerup',event=>{if(!drag)return;const picked=!moved?target(event):null;drag=null;if(picked&&(regularCounts.get(picked.region)||0)>0){const q=new URLSearchParams({category:'regular',state:picked.region});location.href=`dashboard/scout.html?${q}`;}});
 renderer.domElement.addEventListener('pointerleave',()=>{hover=null;tooltip.hidden=true;});
 window.addEventListener('pointercancel',()=>{drag=null;});
 function setAuto(value){auto=value;rotate.textContent=auto?'Ⅱ':'▶';rotate.setAttribute('aria-pressed',String(auto));rotate.setAttribute('aria-label',auto?'Pause map rotation':'Resume map rotation');}
 rotate.disabled=false;reset.disabled=false;setAuto(auto);
 rotate.addEventListener('click',()=>setAuto(!auto));
 reset.addEventListener('click',()=>{yaw=-.08;tilt=0;world.rotation.set(0,yaw,0);renderOnce();});
 reduced.addEventListener('change',()=>{if(reduced.matches)setAuto(false);});
 function renderOnce(){renderer.render(scene,camera);}
 function animate(time){frameId=requestAnimationFrame(animate);if(document.hidden||!visible||time-lastFrame<32){last=time;return;}lastFrame=time;const delta=Math.min((time-(last||time))/1000,.05);last=time;if(auto&&!drag){yaw+=delta*.035*direction;if(yaw>.2||yaw<-.2)direction*=-1;world.rotation.y=yaw;world.rotation.x=tilt;}if(!reduced.matches){halos.forEach((ring,i)=>{const scale=1+Math.sin(time*.0017+i)*.2;ring.scale.setScalar(scale);});}if(auto||!reduced.matches||drag)renderOnce();}
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();cancelAnimationFrame(frameId);stage.classList.remove('ready');hint.textContent='Malaysia overview · use the state links below';rotate.disabled=true;reset.disabled=true;});
 resize();stage.classList.add('ready');hint.textContent='Drag to explore · click a cluster';requestAnimationFrame(animate);
 return {setRegionCounts(next,nextRegular){setRegionCounts(next,nextRegular);renderOnce();}};
}
