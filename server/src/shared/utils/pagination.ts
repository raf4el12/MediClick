const getPagination = (currentPage: number, size: number) => {
  const limit = size ? +size : 3;
  const offset = currentPage >= 1 ? (currentPage - 1) * limit : 0;
  return {
    limit,
    offset,
  };
};

interface DataPagination<T> {
  count: number;
  rows: T[];
}
const getDataPagination = <T>(
  data: DataPagination<T>,
  page: number,
  limit: number,
) => {
  const { count: totalRows, rows: rows } = data;
  const currentPage = page ? +page : 0;
  const totalPages = Math.ceil(totalRows / limit);
  return {
    totalRows,
    rows,
    totalPages,
    currentPage,
  };
};

export default { getPagination, getDataPagination };
