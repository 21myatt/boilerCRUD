type ButtonProps = {
  children: string;
  onClick?: () => void;
};

export const Button = ({ children, onClick }: ButtonProps) => (
  <button onClick={onClick}>{children}</button>
);

