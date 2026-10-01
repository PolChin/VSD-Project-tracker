import React from 'react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Keep editing',
  onConfirm,
  onCancel
}) => (
  <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4" role="presentation">
    <button className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onCancel} aria-label="Close dialog" />
    <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message">
      <h2 id="confirm-dialog-title" className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
      <p id="confirm-dialog-message" className="mt-2 text-sm text-slate-600 dark:text-slate-300">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">{cancelLabel}</button>
        <button onClick={onConfirm} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">{confirmLabel}</button>
      </div>
    </div>
  </div>
);

export default ConfirmDialog;