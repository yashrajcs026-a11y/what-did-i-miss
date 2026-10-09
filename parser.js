// Timestamp prefix, handles all of these:
//   09/10/26, 9:05 am - Name: text         (Android)
//   [09/10/2026, 9:05:30 AM] Name: text    (iPhone)
//   09/10/2026, 21:05 - Name: text         (24-hour)
const TS = String.raw`\[?(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}),?\s+(\d{1,2}:\d{2})(?::\d{2})?(?:\s*([ap]\.?m\.?)(?![a-z]))?\]?`;
const MSG_RE = new RegExp('^' + TS + '\\s*[-–—]?\\s*([^:]{1,40}?):\\s(.*)$', 'i');
const SYS_RE = new RegExp('^' + TS + '\\s*[-–—]?\\s*', 'i');
const PLAIN_RE = /^([^:\n]{1,30}):\s(.+)$/;   // fallback: "Name: text" with no timestamp

function parseChat(raw) {
  const lines = raw.replace(/[\u200e\u200f]/g, '').split(/\r?\n/).map(l =>
    l.replace(/^\[(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[ap]\.?m\.?)?),\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})\]\s*/i, '$2, $1 - '));
  let msgs = parseTimestamped(lines);
  if (msgs.length === 0) msgs = parsePlain(lines);
  else msgs = mergeBursts(msgs);
  return msgs;
}

// Same sender + same minute = one thought sent as several bubbles
function mergeBursts(msgs) {
  const out = [];
  msgs.forEach(m => {
    const prev = out[out.length - 1];
    if (prev && m.time && prev.sender === m.sender && prev.date === m.date && prev.time === m.time) {
      prev.text += ' ' + m.text;
    } else {
      out.push({ ...m });
    }
  });
  return out.map((m, i) => ({ ...m, id: i }));
}

function parseTimestamped(lines) {
  const messages = [];
  let skipping = false;   // true right after a system line, so its extra lines are ignored
  lines.forEach(line => {
    const m = line.match(MSG_RE);
    if (m) {
      messages.push({
        id: messages.length,
        date: m[1],
        time: m[2] + (m[3] ? ' ' + m[3].toLowerCase() : ''),
        sender: m[4].trim(),
        text: m[5].trim()
      });
      skipping = false;
    } else if (SYS_RE.test(line)) {
      skipping = true;    // e.g. "Rahul created group..." has a timestamp but no sender: not a message
    } else if (!skipping && messages.length && line.trim()) {
      messages[messages.length - 1].text += ' ' + line.trim();   // multi-line message continuation
    }
  });
  return messages;
}

function parsePlain(lines) {
  const messages = [];
  lines.forEach(line => {
    const m = line.match(PLAIN_RE);
    if (m) {
      messages.push({ id: messages.length, date: '', time: '', sender: m[1].trim(), text: m[2].trim() });
    } else if (messages.length && line.trim()) {
      messages[messages.length - 1].text += ' ' + line.trim();
    }
  });
  return messages;
}