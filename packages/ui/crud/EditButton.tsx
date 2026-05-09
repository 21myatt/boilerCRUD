type EditButtonProps = {
  onClick?: () => void;
};

export const EditButton = ({ onClick }: EditButtonProps) => (
  <button onClick={onClick}>Edit</button>
);

