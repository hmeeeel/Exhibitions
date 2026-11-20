import styles from './Pagination.module.css';

function pageList(current, total) {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push('gap');
    result.push(page);
  });
  return result;
}

export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <nav className={styles.pagination} aria-label="Страницы списка">
      <button type="button" className="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Назад
      </button>
      <ul className={styles.pages}>
        {pageList(page, totalPages).map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden="true">.</li>
          ) : (
            <li key={item}>
              <button
                type="button"
                className={`${styles.page} ${item === page ? styles.current : ''}`}
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Страница ${item}`}
                onClick={() => onChange(item)}
              >
                {item}
              </button>
            </li>
          ),
        )}
      </ul>
      <button type="button" className="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Вперёд
      </button>
    </nav>
  );
}
