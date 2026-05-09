type ToastProps = {
  message: string;
};

export const Toast = ({ message }: ToastProps) => <div role="status">{message}</div>;

