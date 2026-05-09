type InputProps = {
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
};

export const Input = ({ value, placeholder, onChange }: InputProps) => (
  <input
    value={value}
    placeholder={placeholder}
    onChange={(event) => onChange?.(event.currentTarget.value)}
  />
);

