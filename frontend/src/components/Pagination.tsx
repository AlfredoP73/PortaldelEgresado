import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalItems, pageSize, onPageChange }: PaginationProps) {
    const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) return null;

  const getPaginationRange = () => {
    const delta = 1;
    const range = [];
    const rangeWithDots = [];
    let l: number | undefined;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  const paginationRange = getPaginationRange();

  return (
    <div className="flex items-center justify-between py-4 mt-2">
      <div className="flex flex-1 items-center justify-between">
        <div className="hidden sm:block">
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            {'Mostrando'}{' '}
            <span className="font-medium" style={{ color: 'var(--text-main)' }}>
              {(currentPage - 1) * pageSize + 1}
            </span>{' '}
            {'a'}{' '}
            <span className="font-medium" style={{ color: 'var(--text-main)' }}>
              {Math.min(currentPage * pageSize, totalItems)}
            </span>{' '}
            {'de'}{' '}
            <span className="font-medium" style={{ color: 'var(--text-main)' }}>{totalItems}</span>
          </p>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center justify-center w-8 h-8 rounded-lg disabled:opacity-50 transition-colors hover-bg-muted"
            style={{ color: 'var(--text-secondary)' }}
            aria-label={'Página anterior'}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center space-x-1">
            {paginationRange.map((pageNumber, index) => {
              if (pageNumber === '...') {
                return (
                  <div key={`ellipsis-${index}`} className="flex items-center justify-center w-8 h-8" style={{ color: 'var(--text-muted)' }}>
                    <MoreHorizontal className="h-4 w-4" />
                  </div>
                );
              }

              return (
                <button
                  key={`page-${pageNumber}`}
                  onClick={() => onPageChange(pageNumber as number)}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg text-[13px] font-medium transition-colors hover-bg-muted ${currentPage === pageNumber
                      ? 'bg-brand-600 text-white shadow-sm'
                      : ''
                    }`}
                  style={currentPage !== pageNumber ? { color: 'var(--text-secondary)' } : {}}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center w-8 h-8 rounded-lg disabled:opacity-50 transition-colors hover-bg-muted"
            style={{ color: 'var(--text-secondary)' }}
            aria-label={'Página siguiente'}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}