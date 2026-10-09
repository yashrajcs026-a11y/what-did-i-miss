const RULES = {
  urgency:  { re: /\b(urgent|asap|immediately|right now|emergency|critical)\b/i, weight: 3, tag: 'urgent' },
  deadline: { re: /\b(deadline|due|eod|tonight|tomorrow|today|last date|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}(:\d{2})?\s?(am|pm))\b/i, weight: 3, tag: 'deadline' },
  action:   { re: /\b(please|pls|kindly|need to|have to|must|mandatory|compulsory|submit|send|share|prepare|complete|finish|upload|confirm|attend|join|bring|collect|report to|gather|assemble|go to|come to|come and|don't forget|remember to|make sure)\b/i, weight: 2, tag: 'action' },
  decision: { re: /\b(decided|finalized|finalised|confirmed|approved|agreed|let's go with|we will go with)\b/i, weight: 3, tag: 'decision' }
};

// "not mandatory", "optional", "no need" cancel the action signal
const OPTIONAL_RE = /\b(not (mandatory|compulsory|required|necessary)|optional|no need)\b/i;

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function scoreMessage(msg, myName) {
  let score = 0;
  const tags = [];
  const text = msg.text;
  const lower = msg.sender.toLowerCase();
  const fromMe = !!myName && (lower === myName.toLowerCase() || lower === 'you');

  const mentionRe = new RegExp((myName ? '\\b' + escapeRegExp(myName) + '\\b|' : '') + '@all\\b|@everyone\\b', 'i');
  const mentioned = mentionRe.test(text);

  // A message that is ONLY a mention has no content, so it's a ping, not information
  const stripped = text.replace(mentionRe, '').replace(/[^\p{L}\p{N}]/gu, '');
  if (mentioned && stripped.length < 3) {
    return { ...msg, score: 0, tags: ['ping'], level: 'noise', fromMe };
  }

  if (mentioned) { score += 3; tags.push('mention'); }

  const optional = OPTIONAL_RE.test(text);
  for (const key in RULES) {
    if (key === 'action' && optional) continue;
    if (RULES[key].re.test(text)) {
      score += RULES[key].weight;
      tags.push(RULES[key].tag);
    }
  }
  if (optional) tags.push('optional');

  if (mentioned && text.includes('?')) { score += 1; tags.push('question'); }

  let level = 'noise';
  if (score >= 5) level = 'critical';
  else if (score >= 3) level = 'important';
  else if (score >= 1) level = 'fyi';

  return { ...msg, score, tags, level, fromMe };
}