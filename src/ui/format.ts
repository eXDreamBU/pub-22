const time = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });
const date = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const formatTime = (iso: string) => time.format(new Date(iso));
export const formatDate = (iso: string) => date.format(new Date(iso));

const weekday = new Intl.DateTimeFormat('de-DE', { weekday: 'short' });
const dayMonth = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' });

/** "Sa 18.10." */
export const formatDay = (iso: string) => `${weekday.format(new Date(iso)).replace('.', '')} ${dayMonth.format(new Date(iso))}`;
