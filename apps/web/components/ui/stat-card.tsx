import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  tone?: 'blue' | 'rose' | 'violet' | 'emerald';
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function StatCard({ label, value, description, icon: Icon, trend, tone = 'blue' }: StatCardProps) {
  const toneClasses = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  }[tone];
  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {Icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${toneClasses}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <p className="text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
        {trend && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium ${
              trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {trend.isPositive ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {trend.isPositive ? '+' : '-'}
            {trend.value}
          </span>
        )}
      </div>
      {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
    </div>
  );
}
