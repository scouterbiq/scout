import { parseCSV, leadRegions, isTrainingProvider } from './lead-data.js';
const $ = id => document.getElementById(id);
const formatDate = date => new Intl.DateTimeFormat('en-GB', {day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kuala_Lumpur'}).format(date);
$('today').textContent = formatDate(new Date());
$('today').dateTime = new Date().toISOString().slice(0,10);
let mapController = null;
let mapStarted = false;
const nameKey = row => String(row.company || '').trim().toLowerCase();
const briefingUrl = (category='regular', state) => {
 const query = new URLSearchParams({category});
 if (state) query.set('state',state);
 return `dashboard/scout.html?${query}`;
};
async function csv(url) {
 const response = await fetch(url, {cache:'no-cache'});
 if (!response.ok) throw new Error('Lead source unavailable');
 const text = await response.text();
 if (!text.trim()) return [];
 return parseCSV(text);
}
async function loadData() {
 $('load-error').hidden = true;
 $('data-status').lastChild.textContent = ' Connecting to your briefing…';
 try {
  const [leadResult,handoffResult] = await Promise.allSettled([csv('data/leads.csv'),csv('data/dad-handoff.csv')]);
  if (leadResult.status !== 'fulfilled') throw leadResult.reason;
  const handoff = handoffResult.status === 'fulfilled' ? handoffResult.value : null;
  const handoffNames = new Map((handoff || []).map(row => [nameKey(row),row]));
  const leads = leadResult.value.filter(row => row.priorityTier === 'top').map(row => {
   const extra = handoffNames.get(nameKey(row));
   return {...row, location:row.location || extra?.location || '', leadType:row.leadType || extra?.leadType || ''};
  });
  document.querySelector('.live-pill').innerHTML='<i></i> LIVE DATA';
  const regular = leads.filter(row => !isTrainingProvider(row));
  const training = leads.filter(isTrainingProvider);
  const counts = new Map();
  const regularCounts = new Map();
  let unknown = 0;
  for (const row of leads) {
   const regions = leadRegions(row.location);
   if (regions.includes('Unknown')) unknown++;
   for (const region of regions.filter(r => r !== 'Unknown')) counts.set(region,(counts.get(region) || 0)+1);
  }
  for (const row of regular) for (const region of leadRegions(row.location)) regularCounts.set(region,(regularCounts.get(region) || 0)+1);
  $('total-count').textContent = leads.length;
  $('directory-count').textContent = leads.length;
  $('regular-count').textContent = regular.length;
  $('training-count').textContent = training.length;
  $('ready-count').textContent = handoff ? handoff.length : '—';
  $('region-count').textContent = counts.size;
  const dates = (handoff || []).map(row => row.handoffReadyAt?.slice(0,10)).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  $('data-status').lastChild.textContent = dates.length ? ` Latest handoff addition ${formatDate(new Date(dates.at(-1)+'T12:00:00Z'))}` : ' Connected to the live briefing';
  if (!handoff) $('data-status').lastChild.textContent = ' Briefing connected · handoff details unavailable';
  const links = $('region-links'); links.replaceChildren();
  for (const [region,count] of [...regularCounts].sort((a,b) => b[1]-a[1])) {
   const link = document.createElement('a');link.className='region-link';link.href=briefingUrl('regular',region);
   link.append(document.createTextNode(region === 'Unknown' ? 'Unknown location' : region));
   const badge = document.createElement('b');badge.textContent=count;link.append(badge);links.append(link);
  }
  if (!regular.length) links.textContent = 'No regular SME leads are listed yet.';
  $('coverage-note').textContent = `${unknown} briefing ${unknown === 1 ? 'lead has' : 'leads have'} no matched state. Multi-location businesses can appear in several areas.`;
  if (mapController) mapController.setRegionCounts(counts,regularCounts);
  else if (!mapStarted) {
   mapStarted = true;
   import('./map.js').then(module => module.createMap(counts,regularCounts)).then(controller => {mapController=controller;}).catch(() => {
    $('map-hint').textContent='Malaysia overview · 3D unavailable on this device';
   });
  }
 } catch {
  for (const id of ['total-count','regular-count','training-count','ready-count','region-count']) $(id).textContent='—';
  $('data-status').lastChild.textContent = ' Live data unavailable · try again below';
  $('load-error').hidden=false;
  $('region-links').textContent='Locations will appear when the briefing reconnects.';
  $('coverage-note').textContent='Your lead files remain available through the briefing.';
  $('map-hint').textContent='Malaysia overview';
  document.querySelector('.live-pill').textContent='DATA OFFLINE';
 }
}
$('retry-data').addEventListener('click',loadData);
loadData();
