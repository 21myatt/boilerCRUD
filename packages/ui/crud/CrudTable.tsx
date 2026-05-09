type CrudTableProps<T> = {
  columns: string[];
  data: T[];
  onCreate?: () => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
};

export const CrudTable = <T,>({
  columns,
  data,
  onCreate,
  onEdit,
  onDelete
}: CrudTableProps<T>) => (
  <div>
    <button onClick={onCreate}>Create</button>
    <pre>{JSON.stringify({ columns, data }, null, 2)}</pre>
    <button onClick={() => data[0] && onEdit?.(data[0])}>Edit first</button>
    <button onClick={() => data[0] && onDelete?.(data[0])}>Delete first</button>
  </div>
);

