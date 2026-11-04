import assert from 'node:assert/strict';
import {test} from 'node:test';
import {webUrl,emailAddress,gmailComposeUrl,companyWebsite} from '../assets/contact-links.mjs';
test('company websites use supplied website/domain, distinct from research evidence',()=>{
 assert.equal(webUrl(' example.com/contact '),'https://example.com/contact');
 assert.equal(webUrl('//example.com'),'https://example.com/');
 assert.equal(webUrl('http://example.com'),'http://example.com/');
 assert.equal(companyWebsite({website:'',domain:'www.example.com'}),'https://www.example.com/');
 assert.equal(companyWebsite({sourceUrl:'https://news.example.com'}),'');
 for(const bad of ['javascript:alert(1)','data:text/html,hello','mailto:hello@example.com','/relative-path','https://user:password@example.com','https://example.com\n.evil.com'])assert.equal(webUrl(bad),'');
});
test('email links open a Gmail compose window with the selected recipient and BIQ account',()=>{
 const email='sales+training@example.com';
 const url=new URL(gmailComposeUrl(email));
 assert.equal(url.origin,'https://mail.google.com');assert.equal(url.searchParams.get('to'),email);assert.equal(url.searchParams.get('authuser'),'biqtrainersplt@gmail.com');assert.equal(url.searchParams.get('view'),'cm');
 assert.equal(emailAddress(' mailto:sales@example.com '),'sales@example.com');
 for(const bad of ['not an email','a@example.com\r\nbcc:other@example.com','a@example.com?bcc=other@example.com','<a@example.com>']){assert.equal(emailAddress(bad),'');assert.equal(gmailComposeUrl(bad),'');}
});
