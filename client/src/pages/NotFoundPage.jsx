import { Link } from 'react-router-dom';
import styles from './ExhibitionPage.module.css';

export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <h1 tabIndex={-1}>404. Не найдено</h1>
      <p>Такой страницы не существует или она была удалена.</p>
      <p><Link to="/">Перейти в каталог</Link></p>
    </div>
  );
}
