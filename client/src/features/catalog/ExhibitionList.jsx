import { EmptyMessage, ErrorMessage, Loading } from '../../components/StatusMessage.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { todayInMinsk } from '../../utils/format.js';
import { ExhibitionCard } from './ExhibitionCard.jsx';
import styles from './ExhibitionList.module.css';

export function ExhibitionList({ query, params, selectedId, onHover, onPageChange, onReset, hasActiveFilters }) {
  const { data, isPending, isError, error, refetch, isFetching } = query;

  if (isPending) return <Loading text="Загружаем выставки" />;
  if (isError) return <ErrorMessage error={error} onRetry={refetch} />;

  if (data.items.length === 0) {
    // Если период целиком в прошлом, а завершённые скрыты  - подсказываем включить переключатель
    const hintPast = !params.includePast && params.dateTo && params.dateTo < todayInMinsk();
    return (
      <EmptyMessage
        title="Выставки не найдены"
        action={
          hasActiveFilters && (
            <button type="button" className="button" onClick={onReset}>Сбросить фильтры</button>
          )
        }
      >
        {hintPast ? 'Включите «Показать завершённые»: выбранный период уже прошёл.' : 'Попробуйте изменить условия поиска.'}
      </EmptyMessage>
    );
  }

  return (
    <div aria-busy={isFetching}>
      <p className={styles.total} role="status" aria-live="polite">Найдено выставок: {data.total}</p>
      <ul className={styles.list}>
        {data.items.map((exhibition) => (
          <ExhibitionCard
            key={exhibition.id}
            exhibition={exhibition}
            selected={selectedId === exhibition.id}
            onHover={onHover}
          />
        ))}
      </ul>
      <Pagination page={data.page} totalPages={data.totalPages} onChange={onPageChange} />
    </div>
  );
}
