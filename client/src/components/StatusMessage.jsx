import styles from './StatusMessage.module.css';

export function Loading({ text = 'Загрузка' }) {
  return (
    <p className={styles.status} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      {text}
    </p>
  );
}

export function ErrorMessage({ error, onRetry }) {
  const details = error?.details?.map((d) => d.message).join('. ');
  return (
    <div className={`${styles.status} ${styles.error}`} role="alert">
      <p className={styles.title}>{error?.message ?? 'Что-то пошло не так'}</p>
      {details && <p>{details}</p>}
      {onRetry && (
        <button type="button" className="button" onClick={onRetry}>
          Повторить
        </button>
      )}
    </div>
  );
}

export function EmptyMessage({ title, children, action }) {
  return (
    <div className={styles.status} role="status" aria-live="polite">
      <p className={styles.title}>{title}</p>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
