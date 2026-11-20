import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { getExhibition } from '../api/exhibitions.js';
import { ErrorMessage, Loading } from '../components/StatusMessage.jsx';
import { formatDateRange, formatPrice } from '../utils/format.js';
import { NotFoundPage } from './NotFoundPage.jsx';
import styles from './ExhibitionPage.module.css';

export function ExhibitionPage() {
  const { id } = useParams();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['exhibition', id],
    queryFn: ({ signal }) => getExhibition(id, signal),
  });

  if (isPending) return <div className={styles.page}><Loading /></div>;
  // Несуществующий и некорректный идентификатор ведут на страницу «Не найдено»
  if (isError && (error.status === 404 || error.status === 400)) return <NotFoundPage />;
  if (isError) return <div className={styles.page}><ErrorMessage error={error} onRetry={refetch} /></div>;

  const e = data.exhibition;
  return (
    <article className={styles.page}>
      <Link to="/" className={styles.back}>← К каталогу</Link>
      <div className={styles.badges}>
        <span className={styles.category}>{e.categoryName}</span>
        {e.isEnded && <span className={styles.ended}>Завершена</span>}
      </div>
      <h1 tabIndex={-1}>{e.title}</h1>
      {e.imageUrl && <img className={styles.image} src={e.imageUrl} alt="" loading="lazy" />}
      <dl className={styles.facts}>
        <dt>Даты</dt>
        <dd><time dateTime={e.startDate}>{formatDateRange(e.startDate, e.endDate)}</time></dd>
        <dt>Место</dt>
        <dd>{e.cityName}, {e.address}</dd>
        <dt>Стоимость</dt>
        <dd>{formatPrice(e.price)}</dd>
      </dl>
      <p className={styles.description}>{e.description}</p>
    </article>
  );
}
