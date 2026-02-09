'use client';

import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

interface SkeletonTableProps {
  rowsNum: number;
  colNum: number;
}

export function SkeletonTable({ rowsNum, colNum }: SkeletonTableProps) {
  return (
    <>
      {Array.from({ length: rowsNum }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: colNum }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton variant="text" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
