// H4 clock: one context line with the real local date, time and timezone.
// Agents that were not told the time wrote timestamps ahead of the real clock.

const pad = (n) => String(n).padStart(2, '0');

export function clockLine(now = new Date()) {
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const offset = -now.getTimezoneOffset();
  const sign = offset < 0 ? '-' : '+';
  const abs = Math.abs(offset);
  const utc = `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  let zone = '';
  let weekday = '';
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    zone = '';
  }
  try {
    weekday = now.toLocaleDateString('en-GB', { weekday: 'long' });
  } catch {
    weekday = '';
  }
  const where = zone ? `${zone}, ${utc}` : utc;
  return `Real clock: ${weekday ? weekday + ' ' : ''}${date} ${time} (${where}). Use it for every time you write; never guess a time.`;
}
