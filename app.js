const LEVELS = [
  { key: 'critical', label: 'Critical', icon: '🔥' },
  { key: 'important', label: 'Important', icon: '⚡' },
  { key: 'fyi', label: 'FYI', icon: '💬' },
  { key: 'noise', label: 'Noise', icon: '🔇' }
];
const BLOCKS = [
  { tag: 'action', title: 'Action items', icon: '✅' },
  { tag: 'deadline', title: 'Deadlines', icon: '⏰' },
  { tag: 'mention', title: 'Mentions', icon: '📣' },
  { tag: 'decision', title: 'Decisions', icon: '🏁' }
];

const $ = id => document.getElementById(id);
let state = { others: [], filter: null, sort: 'time', name: '' };

/* ---------- helpers ---------- */
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const initials = name => /^[+\d]/.test(name.trim()) ? '#' : name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
function avatarColor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 45% 42%)`;
}
function countUp(node, target) {
  const start = performance.now(), dur = 700;
  (function tick(now) {
    const p = Math.min((now - start) / dur, 1);
    node.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  })(start);
}

/* Highlight the words that triggered a rule (built with DOM nodes, so it's safe from HTML injection) */
function buildHighlightRe(name) {
  const parts = Object.values(RULES).map(r => '(?:' + r.re.source + ')');
  parts.push('(?:@all\\b|@everyone\\b)');
  if (name) parts.push('(?:\\b' + escapeRegExp(name) + '\\b)');
  return new RegExp(parts.join('|'), 'gi');
}
function highlight(node, text, re) {
  let last = 0, m;
  re.lastIndex = 0;
  while ((m = re.exec(text)) !== null) {
    if (m[0] === '') { re.lastIndex++; continue; }
    node.append(text.slice(last, m.index));
    node.append(el('mark', null, m[0]));
    last = m.index + m[0].length;
  }
  node.append(text.slice(last));
}

/* ---------- analysis ---------- */
function analyze(raw, myName) {
  return parseChat(raw).map(m => scoreMessage(m, myName));
}

/* ---------- rendering ---------- */
function messageCard(m, i, hlRe) {
  const card = el('article', 'msg ' + m.level);
  card.style.setProperty('--i', i);

  const av = el('div', 'avatar', initials(m.sender));
  av.style.background = avatarColor(m.sender);

  const body = el('div', 'body');
  const head = el('div', 'head');
  head.append(el('span', 'sender', m.sender), el('span', 'time', [m.date, m.time].filter(Boolean).join(' · ')));
  const text = el('p', 'text');
  highlight(text, m.text, hlRe);
  const tags = el('div', 'tags');
  m.tags.forEach(t => tags.append(el('span', 'tag t-' + t, t)));
  body.append(head, text, tags);

  card.append(av, body, el('span', 'score', m.score + ' pts'));
  return card;
}

function renderSummary(others, total) {
  const box = $('summary');
  box.innerHTML = '';
  if (!total) {
    box.append(el('div', 'eyebrow', '⚠️ NO MESSAGES FOUND'),
      el('p', 'facts', 'Use the WhatsApp export format, e.g. 09/10/26, 9:05 am - Name: message'));
    return;
  }
  const count = k => others.filter(m => m.level === k).length;
  const withTag = t => others.filter(m => m.tags.includes(t)).length;
  const people = new Set(others.map(m => m.sender)).size;
  const attention = count('critical') + count('important');

  box.append(el('div', 'eyebrow', '✨ TL;DR'));
  box.append(el('h2', 'lead', `You missed ${others.length} messages from ${people} people. Only ${attention} need you.`));
  box.append(el('p', 'facts',
    `${count('critical')} critical · ${withTag('action')} action items · ${withTag('deadline')} deadlines · ${withTag('decision')} decisions`));

  const top = [...others].sort((a, b) => b.score - a.score || b.text.length - a.text.length)[0];
  if (top && top.score > 0) {
    const t = el('div', 'top');
    t.append(el('span', 'top-label', 'TOP PRIORITY'), el('p', null, `“${truncate(top.text, 140)}” — ${top.sender}`));
    box.append(t);
  }
}

function renderStats(others) {
  const box = $('stats');
  box.innerHTML = '';
  LEVELS.forEach(L => {
    const count = others.filter(m => m.level === L.key).length;
    const tile = el('button', 'stat ' + L.key);
    const num = el('span', 'num', '0');
    tile.append(el('span', 'icon', L.icon), num, el('span', 'lbl', L.label));
    tile.addEventListener('click', () => {
      if (L.key === 'noise') {
        $('noiseBox').open = true;
        $('noiseBox').scrollIntoView({ behavior: 'smooth' });
        return;
      }
      state.filter = state.filter === L.key ? null : L.key;
      box.querySelectorAll('.stat').forEach(t => t.classList.remove('active'));
      if (state.filter) tile.classList.add('active');
      renderTimeline();
    });
    box.append(tile);
    countUp(num, count);
  });
}

function renderBlocks(others) {
  const box = $('blocks');
  box.innerHTML = '';
  BLOCKS.forEach(B => {
    const items = others.filter(m => m.tags.includes(B.tag)).sort((a, b) => b.score - a.score);
    const card = el('section', 'card block');
    const head = el('div', 'block-head');
    head.append(el('span', null, B.icon), el('h3', null, B.title), el('span', 'count', String(items.length)));
    card.append(head);
    if (!items.length) card.append(el('p', 'empty', 'Nothing here 🎉'));
    items.slice(0, 4).forEach(m => {
      const row = el('div', 'row-item ' + m.level);
      row.append(el('strong', null, m.sender + ': '), document.createTextNode(truncate(m.text, 90)));
      card.append(row);
    });
    if (items.length > 4) card.append(el('p', 'more', `+${items.length - 4} more in the timeline`));
    box.append(card);
  });
}

function renderTimeline() {
  const hlRe = buildHighlightRe(state.name);
  const tl = $('timeline');
  tl.innerHTML = '';

  let shown = state.others.filter(m => m.level !== 'noise' && (!state.filter || m.level === state.filter));
  if (state.sort === 'priority') shown = [...shown].sort((a, b) => b.score - a.score || a.id - b.id);
  shown.forEach((m, i) => tl.append(messageCard(m, i, hlRe)));
  if (!shown.length) tl.append(el('p', 'empty', 'Nothing to show for this filter.'));

  const noise = state.others.filter(m => m.level === 'noise');
  $('noiseSummary').textContent = `🔇 ${noise.length} low-priority messages hidden`;
  const nl = $('noiseList');
  nl.innerHTML = '';
  noise.forEach((m, i) => nl.append(messageCard(m, i, hlRe)));
  $('noiseBox').hidden = noise.length === 0;
}

/* ---------- main ---------- */
function run(scroll) {
  const raw = $('rawChat').value;
  const name = $('myName').value.trim();
  let results = analyze(raw, name);
  const n = parseInt($('lastN').value, 10);
  if (n > 0) results = results.slice(-n);          // "unread" = only the last N messages

  const others = results.filter(m => !m.fromMe);   // you can't "miss" your own messages
  state.others = others;
  state.name = name;
  state.filter = null;

  $('results').hidden = false;
  renderSummary(others, results.length);
  renderStats(others);
  renderBlocks(others);
  renderTimeline();
  if (scroll) $('results').scrollIntoView({ behavior: 'smooth' });
}

$('analyzeBtn').addEventListener('click', () => run(true));
$('sampleBtn').addEventListener('click', () => { $('rawChat').value = SAMPLE_CHAT; run(true); });
$('fileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();                 // read locally, never uploaded
  reader.onload = () => { $('rawChat').value = reader.result; run(true); };
  reader.readAsText(file);
});
document.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => {
  state.sort = b.dataset.sort;
  document.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b));
  renderTimeline();
}));

