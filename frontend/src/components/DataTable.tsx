import { useMemo, useRef, useState, type ReactNode } from 'react';

export interface DataColumn<T> {
  /** CSS 변수로 주입될 열 라벨 (스택 레이아웃용) */
  key: string;
  header: string;
  sortable?: boolean;
  /** number 일 경우 data-value로 수치 비교 */
  type?: 'text' | 'number';
  /** 정렬·표시용 원시 값 */
  value?: (row: T) => string | number | null;
  render?: (row: T, index: number) => ReactNode;
}

interface Props<T> {
  caption: string;
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** 첫 번째 열을 행 헤더(th scope=row)로 렌더링 */
  rowHeader?: (row: T) => ReactNode;
  emptyText?: string;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/**
 * 반응형 데이터 테이블
 * - responsive-table 가이드: sticky 헤더/행헤더, 컨테이너 쿼리 스택 레이아웃,
 *   role="region" + aria-labelledby + tabindex=0
 * - sortable-table 가이드: th 내 <button>, aria-sort는 th에만, Intl.Collator,
 *   정렬 상태는 단일 role="status" 영역이 공지
 */
export default function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  rowHeader,
  emptyText = '데이터가 없습니다.',
}: Props<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [direction, setDirection] = useState<'ascending' | 'descending'>('ascending');
  const [announcement, setAnnouncement] = useState('');
  const captionId = useRef(`caption-${Math.random().toString(36).slice(2, 9)}`).current;

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return rows;
    const factor = direction === 'ascending' ? 1 : -1;
    const raw = (row: T) => {
      const v = col.value ? col.value(row) : (row as any)[sortKey];
      return v ?? '';
    };
    return [...rows].sort((a, b) => {
      const va = raw(a);
      const vb = raw(b);
      if (col.type === 'number') return factor * (Number(va) - Number(vb));
      return factor * collator.compare(String(va), String(vb));
    });
  }, [rows, sortKey, direction, columns]);

  const toggleSort = (col: DataColumn<T>) => {
    const nextDirection =
      sortKey === col.key && direction === 'ascending' ? 'descending' : 'ascending';
    setSortKey(col.key);
    setDirection(nextDirection);
    setAnnouncement(
      `${col.header} 기준 ${nextDirection === 'ascending' ? '오름차순' : '내림차순'} 정렬, ${rows.length}행`,
    );
  };

  return (
    <>
      <div
        tabIndex={0}
        role="region"
        aria-labelledby={captionId}
        className="table-wrapper"
      >
        <table className="jir-table">
          <caption id={captionId} className="visually-hidden">
            {caption}
          </caption>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={
                    sortKey === col.key
                      ? direction
                      : undefined
                  }
                >
                  {col.sortable ? (
                    <button type="button" onClick={() => toggleSort(col)}>
                      {col.header}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-gray-500">
                  {emptyText}
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => (
                <tr key={rowKey(row)}>
                  {columns.map((col, ci) => {
                    const label = col.header;
                    if (ci === 0 && rowHeader) {
                      return (
                        <th key={col.key} scope="row">
                          {rowHeader(row)}
                        </th>
                      );
                    }
                    return (
                      <td key={col.key} data-label={label}>
                        {col.render ? col.render(row, i) : String(col.value ? col.value(row) ?? '' : (row as any)[col.key] ?? '')}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div role="status" className="visually-hidden">
        {announcement}
      </div>
    </>
  );
}
