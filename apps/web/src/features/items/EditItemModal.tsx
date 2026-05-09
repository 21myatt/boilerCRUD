type EditItemModalProps = {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  busy?: boolean;
};

export const EditItemModal = ({ value, onChange, onSave, onClose, busy }: EditItemModalProps) => (
  <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(20,14,10,0.52)] p-5" role="presentation" onClick={onClose}>
    <div
      className="grid w-full max-w-[520px] gap-3.5 rounded-[20px] border border-[var(--border)] bg-[var(--panel)] p-[18px] shadow-[var(--shadow)] backdrop-blur-[12px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-item-title"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="grid gap-2">
        <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#8d6743]">Edit item</p>
        <h2 id="edit-item-title" className="m-0 tracking-[-0.03em]">Update the name</h2>
        <p className="m-0 leading-[1.45] text-[var(--muted)]">Change the item name without leaving the page.</p>
      </div>

      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <label className="grid gap-2">
          <span className="text-[0.84rem] font-bold text-[var(--muted)]">Item name</span>
          <input
            autoFocus
            className="w-full rounded-[14px] border border-[rgba(42,29,20,0.12)] bg-[var(--panel-strong)] px-3.5 py-3 text-[var(--text)] outline-none transition focus:border-[rgba(28,23,20,0.34)] focus:shadow-[0_0_0_4px_rgba(28,23,20,0.08)]"
            value={value}
            onChange={(event) => onChange(event.currentTarget.value)}
            placeholder="Updated name"
          />
        </label>

        <div className="flex flex-wrap justify-end gap-2.5">
          <button className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--accent-soft)] px-4 py-3 font-bold tracking-[-0.01em] text-[var(--text)] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[linear-gradient(180deg,#2a2420_0%,#151210_100%)] px-4 py-3 font-bold tracking-[-0.01em] text-[#fffdf9] shadow-[0_8px_18px_rgba(21,18,16,0.14)] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0" type="submit" disabled={busy || value.trim().length === 0}>
            {busy ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  </div>
);
