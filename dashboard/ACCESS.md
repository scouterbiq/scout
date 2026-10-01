# Scout access screen

Every HTML entry point prompts for a shared code before loading dashboard scripts. The accepted code is remembered in sessionStorage for the current browser tab. Lock Scout clears that tab access without deleting CRM notes.

This is a convenience screen, not authentication. GitHub Pages serves public files and this repository is public: source, JSON and CSV remain accessible directly, and client-side checks can be bypassed. Do not rely on this screen to protect confidential information. Real access control needs a server or an authenticated hosting gateway protecting both pages and data.

Only a SHA-256 digest is stored in access.js. To rotate the code, replace CODE_HASH with the SHA-256 hexadecimal digest of a new strong code. Existing sessions are invalidated when the hash changes. Never commit the plaintext code.
