export function formatCOP(value: number | undefined | null): string {
  const num = Number(value) || 0;
  return '$ ' + num.toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

export function formatTime12h(dateTimeStr?: string | null): string {
  if (!dateTimeStr) return '—';
  const parts = dateTimeStr.split(' ');
  const timePart = parts[1] || '';
  if (!timePart) return '—';
  const [hh, mm] = timePart.split(':').map(Number);
  if (Number.isNaN(hh)) return '—';
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(mm || 0).padStart(2, '0')} ${ampm}`;
}

export function formatDateShort(dateTimeStr?: string | null): string {
  if (!dateTimeStr) return '—';
  const datePart = dateTimeStr.split(' ')[0];
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) return dateTimeStr;
  const [, y, m, d] = match;
  return `${d}/${m}/${y}`;
}

export function getFallbackAvatar(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'M')}&background=dcfce7&color=15803d&bold=true`;
}
