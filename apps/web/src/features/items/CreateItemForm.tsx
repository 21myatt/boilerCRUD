type CreateItemFormProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  busy?: boolean;
};

export const CreateItemForm = ({ value, onChange, onSubmit, busy }: CreateItemFormProps) => (
  <form
    className="grid gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--panel)] p-[18px] shadow-[var(--shadow)] backdrop-blur-[12px]"
    onSubmit={(event) => {
      event.preventDefault();
      onSubmit();
    }}
  >
    <div className="grid gap-1">
      <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#8d6743]">Create item</p>
      <h2 className="m-0 tracking-[-0.03em]">Capture a new record</h2>
      <p className="m-0 leading-[1.45] text-[var(--muted)]">Add a name and it is saved to the shared local database instantly.</p>
    </div>

    <div className="grid items-end gap-2.5 md:grid-cols-[minmax(0,1fr)_auto]">
      <label className="grid gap-2">
        <span className="text-[0.84rem] font-bold text-[var(--muted)]">Item name</span>
        <input
          className="w-full rounded-[14px] border border-[rgba(42,29,20,0.12)] bg-[var(--panel-strong)] px-3.5 py-3 text-[var(--text)] outline-none transition focus:border-[rgba(28,23,20,0.34)] focus:shadow-[0_0_0_4px_rgba(28,23,20,0.08)]"
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder="Design review notes"
        />
      </label>
      <button className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[linear-gradient(180deg,#2a2420_0%,#151210_100%)] px-4 py-3 font-bold tracking-[-0.01em] text-[#fffdf9] shadow-[0_8px_18px_rgba(21,18,16,0.14)] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0" type="submit" disabled={busy || value.trim().length === 0}>
        {busy ? "Saving..." : "Create item"}
      </button>
    </div>
  </form>
);
