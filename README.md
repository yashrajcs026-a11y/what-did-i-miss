# What Did I Miss? 🔥

A local-first AI micro-app for the **Unread Problem** challenge. Paste or upload a chat and instantly see what matters, ranked by urgency.

**Live demo:** <paste your GitHub Pages link here>

## Features
- Summary (TL;DR) of unread messages
- Messages ranked into Critical / Important / FYI / Noise, colour-coded
- Dedicated blocks for action items, deadlines, mentions and decisions
- "Only last N messages" to analyze just the unread part
- Supports WhatsApp exports (Android and iPhone) and plain `Name: text`

## Local-first privacy
Pure HTML/CSS/JS. There is no backend, no API calls, and no external fonts or libraries.
Chats are processed inside your browser and never leave your device (check the Network tab).

## How the ranking works
Each message earns points from transparent rules:

| Signal | Points |
|---|---|
| Mentions you (name, @all, @everyone) | +3 |
| Urgency words (urgent, asap, immediately...) | +3 |
| Deadline words or times (today, tomorrow, 5 pm...) | +3 |
| Decisions (finalized, confirmed, approved...) | +3 |
| Action words (please, submit, attend, join...) | +2 |
| Question directed at you | +1 |

"Not mandatory / optional / no need" cancels the action points.
A message that is only a mention is treated as a ping (noise).
Messages from the same sender in the same minute are merged into one.

| Score | Level | Colour |
|---|---|---|
| 5+ | Critical | Coral red |
| 3-4 | Important | Amber |
| 1-2 | FYI | Sky blue |
| 0 | Noise (collapsed) | Slate grey |

## Run locally
Open `index.html` in a browser. No install needed.

## AI usage
Built with assistance from Claude (Anthropic). All prompts are in [PROMPTS.md](PROMPTS.md).