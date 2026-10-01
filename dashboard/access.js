(() => {
  'use strict';
  const CODE_HASH = '9f95db8be1cd42d6b9b5c7ac05effe68709346f5e5d44254d5052189ca2d8ecc';
  const SESSION_KEY = 'scout-access-v1';
  const root = document.documentElement;
  const storage = {
    get() { try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; } },
    set() { try { sessionStorage.setItem(SESSION_KEY, CODE_HASH); } catch {} },
    clear() { try { sessionStorage.removeItem(SESSION_KEY); } catch {} }
  };
  let opened = false;
  async function openScout() {
    if (opened) return;
    opened = true;
    storage.set();
    const destination = document.body.dataset.scoutDestination;
    if (destination) { location.replace(destination); return; }
    for (const original of document.querySelectorAll('script[type="application/scout-locked"]')) {
      const script = document.createElement('script');
      if (original.dataset.scoutSrc) {
        script.src = original.dataset.scoutSrc;
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error('A dashboard file could not load. Please refresh.'));
          document.body.appendChild(script);
        });
      } else {
        script.textContent = original.textContent;
        document.body.appendChild(script);
      }
    }
    document.getElementById('scout-access-gate').remove();
    root.classList.remove('scout-locked');
    const lock = document.createElement('button');
    lock.id = 'scout-lock-button';
    lock.type = 'button';
    lock.textContent = 'Lock Scout';
    lock.addEventListener('click', () => { storage.clear(); location.reload(); });
    document.body.appendChild(lock);
  }
  async function digest(code) {
    if (!globalThis.crypto?.subtle) throw new Error('Open Scout using its HTTPS link to enter your code.');
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code.trim()));
    return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
  }
  function start() {
    const gate = document.createElement('main');
    gate.id = 'scout-access-gate';
    gate.innerHTML = '<section class="scout-access-card" aria-labelledby="scout-access-title"><div class="scout-access-brand">SCOUT</div><h1 id="scout-access-title">Enter your access code</h1><p>Use the shared code to open your workspace.</p><form id="scout-access-form"><label for="scout-access-code">Access code</label><input id="scout-access-code" name="code" type="password" required autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Enter code"><button type="submit" id="scout-access-submit">Open Scout</button><p id="scout-access-error" role="status" aria-live="polite"></p></form></section>';
    document.body.appendChild(gate);
    const input = document.getElementById('scout-access-code');
    const error = document.getElementById('scout-access-error');
    const button = document.getElementById('scout-access-submit');
    const fail = e => { error.textContent = e.message || 'Could not open Scout. Please refresh.'; };
    document.getElementById('scout-access-form').addEventListener('submit', async event => {
      event.preventDefault();
      error.textContent = '';
      button.disabled = true;
      try {
        if (await digest(input.value) !== CODE_HASH) {
          error.textContent = 'Incorrect code. Please try again.';
          input.value = '';
          input.focus();
        } else {
          await openScout();
        }
      } catch (e) { fail(e); }
      finally { button.disabled = false; }
    });
    if (storage.get() === CODE_HASH) openScout().catch(fail);
    else input.focus();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();