import { Link } from 'react-router-dom';
import { formatDateRange, formatPrice } from '../../utils/format.js';
import styles from './ExhibitionCard.module.css';

/** Карточка списка. Пользовательский текст выводится как обычный текст (без dangerouslySetInnerHTML). */
export function ExhibitionCard({ exhibition, selected, onHover }) {
  const hasCoords = exhibition.lat !== null && exhibition.lng !== null;
  return (
    <li
      id={`exhibition-card-${exhibition.id}`}
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      onMouseEnter={() => onHover(exhibition.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(exhibition.id)}
      onBlur={() => onHover(null)}
    >
      <div className={styles.media}>
        {exhibition.imageUrl ? (
          <img src={exhibition.imageUrl} alt="" width="160" height="120" loading="lazy" />
        ) : (
          <span className={styles.placeholder} aria-hidden="true">🖼</span>
        )}
      </div>
      <div className={styles.body}>
        <div className={styles.badges}>
          <span className={styles.category}>{exhibition.categoryName}</span>
          {exhibition.isEnded && <span className={styles.ended}>Завершена</span>}
        </div>
        <h3 className={styles.title}>
          <Link to={`/exhibitions/${exhibition.id}`}>{exhibition.title}</Link>
        </h3>
        <p className={styles.meta}>
          {exhibition.cityName}, {exhibition.address}
        </p>
        <p className={styles.meta}>
          <time dateTime={exhibition.startDate}>{formatDateRange(exhibition.startDate, exhibition.endDate)}</time>
          {' · '}
          {formatPrice(exhibition.price)}
        </p>
        {!hasCoords && <p className={styles.noPlace}>Точное место не указано</p>}
      </div>
    </li>
  );
}
