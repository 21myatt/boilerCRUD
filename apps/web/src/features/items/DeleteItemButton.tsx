type DeleteItemButtonProps = {
  onDelete: () => void;
  busy?: boolean;
};

export const DeleteItemButton = ({ onDelete, busy }: DeleteItemButtonProps) => (
  <button
    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-[linear-gradient(180deg,#b54b3d_0%,#912f22_100%)] px-3.5 py-2.5 text-sm font-bold tracking-[-0.01em] text-[#fffaf8] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
    type="button"
    onClick={onDelete}
    disabled={busy}
  >
    Delete
  </button>
);
