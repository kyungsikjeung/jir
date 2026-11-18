const STATUS_CLASS: Record<string, string> = {
  open: 'badge-open',
  'in progress': 'badge-open',
  'in review': 'badge-in-review',
  approved: 'badge-approved',
  released: 'badge-released',
  done: 'badge-done',
  closed: 'badge-done',
  obsolete: 'badge-obsolete',
  draft: 'badge-obsolete',
};

const PRIORITY_CLASS: Record<string, string> = {
  critical: 'badge-critical',
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
};

/** 색상만으로 상태를 전달하지 않고 텍스트도 함께 표시 (html 가이드) */
export function StatusBadge({ value, kind = 'status' }: { value?: string; kind?: 'status' | 'priority' }) {
  if (!value) return <span className="text-gray-400 text-sm">—</span>;
  const cls =
    kind === 'priority'
      ? PRIORITY_CLASS[value.toLowerCase()] || 'badge-low'
      : STATUS_CLASS[value.toLowerCase()] || 'badge-open';
  return <span className={`badge ${cls}`}>{value}</span>;
}
