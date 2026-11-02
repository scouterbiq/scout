// Shared CSV parsing, category rules and location matching from the Scout briefing.
function parseCSV(text){
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++){
    const c = text[i], next = text[i+1];
    if (inQuotes){
      if (c === '"' && next === '"'){ field += '"'; i++; }
      else if (c === '"'){ inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"'){ inQuotes = true; }
      else if (c === ','){ row.push(field); field = ""; }
      else if (c === '\n' || c === '\r'){
        if (field.length || row.length){ row.push(field); rows.push(row); row = []; field = ""; }
        if (c === '\r' && next === '\n') i++;
      } else { field += c; }
    }
  }
  if (field.length || row.length){ row.push(field); rows.push(row); }
  const headers = rows.shift().map(h => h.trim());
  return rows.filter(r => r.length > 1 || r[0]).map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = (r[i] || "").trim());
    return obj;
  });
}
const REGIONS = ["Johor","Kedah","Kelantan","Melaka","Negeri Sembilan","Pahang","Penang","Perak","Perlis","Sabah","Sarawak","Selangor","Terengganu","Kuala Lumpur","Labuan","Putrajaya"];
function leadRegions(location){
 const text=String(location || "").toLowerCase();
 const found=REGIONS.filter(region=>new RegExp('\\b'+region.toLowerCase()+'\\b').test(text));
 if(/\b(pulau pinang|pinang)\b/.test(text) && !found.includes('Penang')) found.push('Penang');
 if(/\bmalacca\b/.test(text) && !found.includes('Melaka')) found.push('Melaka');
 if(/\bpetaling jaya\b/.test(text) && !found.includes('Selangor')) found.push('Selangor');
 return found.length ? found : ['Unknown'];
}
function isTrainingProvider(lead){
 const type=String(lead.leadType || '').toLowerCase();
 if(type==='training_provider') return true;
 if(type==='regular_company') return false;
 // Classify the company's services, not its suggested staff training needs.
 return /\bfreelance trainer partnership\b/i.test(lead.fitNote || '') ||
   (/\b(training|learning and development|executive education)\b/i.test(lead.industry || '') &&
    !/\btraining equipment\b/i.test(lead.industry || ''));
}
export { parseCSV, REGIONS, leadRegions, isTrainingProvider };
