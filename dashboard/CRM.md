# Scout CRM

Open crm.html from the lead briefing. It loads prospects.json and leads.json and keeps qualification based on pipeline evidence. Deal stages never change qualification.

Stages: New, Researching, Contacted, Meeting booked, Proposal sent, Won, Lost. Company/contact details, notes and follow-up dates are editable. Search, qualification/stage filters and due follow-ups narrow the list. Export visible records to CSV; download JSON backups and restore them to transfer edits between browsers.

Edits are held in localStorage on this browser/device, not committed to GitHub. There is no login or shared backend. The website and source data remain public; private notes stay in the browser unless you share a backup. Backup restore merges saved edits and replaces matching records. New source records appear on refresh. No outreach is sent.
