type CreateButtonProps = {
  onClick?: () => void;
};

export const CreateButton = ({ onClick }: CreateButtonProps) => (
  <button onClick={onClick}>Create</button>
);

