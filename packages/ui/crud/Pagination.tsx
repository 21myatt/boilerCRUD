type PaginationProps = {
  page: number;
  totalPages: number;
};

export const Pagination = ({ page, totalPages }: PaginationProps) => (
  <nav>
    Page {page} of {totalPages}
  </nav>
);

