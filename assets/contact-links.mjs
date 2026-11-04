/** @param {unknown} value */
export function webUrl(value) {
 const text=typeof value==='string'?value.trim():'';
 if(!text||/[\s\u0000-\u001f\u007f]/.test(text))return '';
 const candidate=text.startsWith('//')?'https:'+text:/^[a-z][a-z\d+.-]*:/i.test(text)?text:'https://'+text;
 try{const url=new URL(candidate);return ['https:','http:'].includes(url.protocol)&&url.hostname.includes('.')&&!url.username&&!url.password?url.href:'';}catch{return '';}
}
/** @param {unknown} value */
export function emailAddress(value) {
 const text=typeof value==='string'?value.trim().replace(/^mailto:/i,''):'';
 return /^[^\s@<>,;:"?&#]+@[a-z\d](?:[a-z\d.-]*[a-z\d])?\.[a-z]{2,63}$/i.test(text)?text:'';
}
/** @param {unknown} value */
export function gmailComposeUrl(value) {
 const email=emailAddress(value);
 return email?'https://mail.google.com/mail/?view=cm&fs=1&authuser=biqtrainersplt%40gmail.com&to='+encodeURIComponent(email):'';
}
/** @param {{website?:unknown,domain?:unknown}} company */
export function companyWebsite(company) {return webUrl(company?.website)||webUrl(company?.domain);}
