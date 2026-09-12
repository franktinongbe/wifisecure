export type StatusType = 'active' | 'resolved' | 'pending' | 'blocked' | string;

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
}

const statusStyles: Record<string, string> = {
  active: 'bg-amber-100 text-amber-700 border-amber-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  blocked: 'bg-rose-100 text-rose-700 border-rose-200',
  default: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();
  const style = statusStyles[normalizedStatus] || statusStyles.default;

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}>
      {label || status}
    </span>
  );
}