type ModalProps = {
  open: boolean;
  title: string;
  children: string;
};

export const Modal = ({ open, title, children }: ModalProps) =>
  open ? (
    <div role="dialog" aria-label={title}>
      {children}
    </div>
  ) : null;

