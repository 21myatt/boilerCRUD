type FormProps = {
  children: string;
  onSubmit?: () => void;
};

export const Form = ({ children, onSubmit }: FormProps) => (
  <form
    onSubmit={(event) => {
      event.preventDefault();
      onSubmit?.();
    }}
  >
    {children}
  </form>
);

