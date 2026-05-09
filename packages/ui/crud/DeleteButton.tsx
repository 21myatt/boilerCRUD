type DeleteButtonProps = {
  onClick?: () => void;
};

export const DeleteButton = ({ onClick }: DeleteButtonProps) => (
  <button onClick={onClick}>Delete</button>
);

