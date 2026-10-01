import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ icon: Icon, title, description }) => (
  <div className="flex items-center gap-3 w-full xl:w-auto">
    <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex-shrink-0">
      <Icon size={24} className="text-indigo-600 dark:text-indigo-400" />
    </div>
    <div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{title}</h2>
      <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">{description}</p>
    </div>
  </div>
);

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({ children, className = '' }) => (
  <div className={`flex flex-wrap items-center gap-3 w-full xl:w-auto xl:justify-end ${className}`}>
    {children}
  </div>
);

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description }) => (
  <div className="py-24 flex flex-col items-center justify-center text-center px-4">
    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mb-5">
      <Icon size={32} className="text-slate-300 dark:text-slate-600" />
    </div>
    <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300">{title}</h3>
    {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
  </div>
);

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-800 ${className}`} aria-hidden="true" />
);

interface ToastProps {
  tone: 'success' | 'error' | 'info';
  message: string;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ tone, message, onDismiss }) => {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'error' ? AlertCircle : Info;
  const toneClass = tone === 'success'
    ? 'border-emerald-200 text-emerald-800 dark:border-emerald-900 dark:text-emerald-300'
    : tone === 'error'
      ? 'border-rose-200 text-rose-800 dark:border-rose-900 dark:text-rose-300'
      : 'border-sky-200 text-sky-800 dark:border-sky-900 dark:text-sky-300';

  return (
    <div className={`fixed bottom-4 right-4 z-[1300] flex max-w-sm items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-xl dark:bg-slate-900 ${toneClass}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={18} className="flex-shrink-0" />
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onDismiss} className="ml-2 rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Dismiss notification">
        <X size={16} />
      </button>
    </div>
  );
};

interface DrawerProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
}

export const Drawer: React.FC<DrawerProps> = ({ open, title, children, footer, onClose }) => {
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1050] flex justify-end" role="presentation">
      <button className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={onClose} aria-label="Close details" />
      <aside className="relative flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 id="drawer-title" className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close details">
            <X size={18} />
          </button>
        </header>
        <div className="custom-scrollbar flex-grow overflow-y-auto p-5">{children}</div>
        {footer && <footer className="flex flex-shrink-0 justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-800">{footer}</footer>}
      </aside>
    </div>
  );
};

interface DataTableColumn<Row> {
  header: string;
  className?: string;
  render: (row: Row) => React.ReactNode;
}

interface DataTableProps<Row> {
  rows: Row[];
  columns: DataTableColumn<Row>[];
  getRowKey: (row: Row) => React.Key;
  onRowClick?: (row: Row) => void;
  label: string;
  className?: string;
}

export const DataTable = <Row,>({ rows, columns, getRowKey, onRowClick, label, className = '' }: DataTableProps<Row>) => (
  <table className={`w-full border-collapse text-left ${className}`} aria-label={label}>
    <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950">
      <tr>
        {columns.map(column => <th key={column.header} scope="col" className={`px-4 py-3 font-semibold ${column.className || ''}`}>{column.header}</th>)}
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
      {rows.map(row => (
        <tr
          key={getRowKey(row)}
          tabIndex={onRowClick ? 0 : undefined}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
          onKeyDown={onRowClick ? event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onRowClick(row);
            }
          } : undefined}
          className={onRowClick ? 'cursor-pointer hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 dark:hover:bg-slate-800/50' : undefined}
        >
          {columns.map(column => <td key={column.header} className={column.className || 'px-4 py-3'}>{column.render(row)}</td>)}
        </tr>
      ))}
    </tbody>
  </table>
);

interface StatusBadgeProps {
  label: string;
  color?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, color = '#94a3b8', className = '' }) => (
  <span
    className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white ${className}`}
    style={{ backgroundColor: color }}
  >
    {label}
  </span>
);

interface ProgressBarProps {
  value: number;
  color?: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, color = '#6366f1', className = '' }) => {
  const boundedValue = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;

  return (
    <div
      className={`h-1 w-full overflow-hidden rounded-full bg-slate-200 shadow-inner dark:bg-slate-800 ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={boundedValue}
    >
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${boundedValue}%`, backgroundColor: color }}
      />
    </div>
  );
};