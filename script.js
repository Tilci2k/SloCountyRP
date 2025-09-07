// Branje nastavitev iz <body data-*>
const body = document.body;
const CFG = {
  cfx: (body.dataset.cfx || 'CFX_CODE').trim(),
  ip: (body.dataset.ip || 'SERVER_IP').trim(),
  port: (body.dataset.port || '30120').trim(),
  discord: (body.dataset.discord || '').trim(),
  discordId: (body.dataset.discordId || 'DISCORD_SERVER_ID').trim(),
};

// Povezave in elementi
const $ = (s) => document.querySelector(s);
const statusBox = document.querySelector('.status');
const statusText = $('#statusText');
const playersCount = $('#playersCount');
const discordLinks = ['#discordLink', '#discordLink2', '#discordLink3'].map(s => $(s));
const playCfx = $('#playCfx');
const playDirect = $('#playDirect');
const cfxLink = $('#cfxLink');
const copyDirect = $('#copyDirect');
const copyCfx = $('#copyCfx');
const connectCommand = $('#connectCommand');
const discordWidget = $('#discordWidget');

// Mobilni meni
const toggle = document.querySelector('.nav-toggle');
const menu = document.getElementById('meni');
if (toggle && menu) {
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    menu.classList.toggle('open');
  });
  menu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Leto v footerju
document.getElementById('year').textContent = new Date().getFullYear();

// Nastavi povezave iz konfiguracije
discordLinks.forEach(a => { if (a && CFG.discord) a.href = CFG.discord; });
if (playCfx) playCfx.href = CFG.cfx && CFG.cfx !== 'CFX_CODE' ? `https://cfx.re/join/${CFG.cfx}` : '#';
if (cfxLink) cfxLink.href = playCfx ? playCfx.href : '#';
if (connectCommand) connectCommand.textContent = `connect ${CFG.ip}:${CFG.port}`;
if (playDirect) playDirect.href = `fivem://connect/${CFG.ip}:${CFG.port}`;

// Discord widget (light tema)
if (discordWidget && CFG.discordId && CFG.discordId !== 'DISCORD_SERVER_ID') {
  discordWidget.src = `https://discord.com/widget?id=${CFG.discordId}&theme=light`;
} else if (discordWidget) {
  discordWidget.parentElement.style.display = 'none';
}

// Gumba "Kopiraj"
function copyText(text, btn) {
  if (!navigator.clipboard) {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } finally { document.body.removeChild(ta); }
  } else {
    navigator.clipboard.writeText(text).catch(() => {});
  }
  if (btn) {
    const prev = btn.textContent;
    btn.textContent = 'Kopirano!';
    setTimeout(() => (btn.textContent = prev), 1200);
  }
}
if (copyDirect) copyDirect.addEventListener('click', () => copyText(`connect ${CFG.ip}:${CFG.port}`, copyDirect));
if (copyCfx) copyCfx.addEventListener('click', () => {
  if (CFG.cfx && CFG.cfx !== 'CFX_CODE') copyText(`https://cfx.re/join/${CFG.cfx}`, copyCfx);
});

// Status strežnika (cfx API -> fallback info.json/players.json). CORS lahko blokira neposreden IP.
async function preveriStatus() {
  const setState = (state, text, players) => {
    statusBox.classList.remove('ok', 'warn', 'err');
    statusBox.classList.add(state);
    statusText.textContent = text;
    playersCount.textContent = players ? ` • ${players}` : '';
  };

  // cfx.re API
  if (CFG.cfx && CFG.cfx !== 'CFX_CODE') {
    try {
      const r = await fetch(`https://servers-frontend.fivem.net/api/servers/single/${CFG.cfx}`, { cache: 'no-store' });
      if (r.ok) {
        const data = await r.json();
        const online = data?.Data?.clients >= 0;
        const clients = data?.Data?.clients ?? 0;
        const max = data?.Data?.sv_maxclients ?? 0;
        if (online) {
          setState('ok', 'Na spletu', `${clients}/${max} igralcev`);
          return;
        }
      }
    } catch (e) { /* ignoriraj */ }
  }

  // Fallback: neposredno (lahko blokira CORS)
  const base = `http://${CFG.ip}:${CFG.port}`;
  try {
    const [infoR, playersR] = await Promise.allSettled([
      fetch(`${base}/info.json`, { cache: 'no-store' }),
      fetch(`${base}/players.json`, { cache: 'no-store' })
    ]);
    let clients = 0, max = 0;
    if (playersR.status === 'fulfilled' && playersR.value.ok) {
      const arr = await playersR.value.json();
      clients = Array.isArray(arr) ? arr.length : 0;
    }
    if (infoR.status === 'fulfilled' && infoR.value.ok) {
      const info = await infoR.value.json();
      max = info?.vars?.sv_maxClients || info?.vars?.sv_maxclients || 0;
    }
    if (clients > 0 || max > 0) {
      setState('ok', 'Na spletu', `${clients}/${max || '?'} igralcev`);
    } else {
      setState('warn', 'Stanje neznano', 'Klikni “Igraj prek cfx.re”');
    }
  } catch {
    setState('warn', 'Stanje neznano', 'Klikni “Igraj prek cfx.re”');
  }
}
preveriStatus();
setInterval(preveriStatus, 60_000);