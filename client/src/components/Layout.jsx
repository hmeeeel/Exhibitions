import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import styles from './Layout.module.css';

const NAV_ITEMS = [{ to: '/', label: 'Каталог', end: true }];

export function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.querySelector('main h1')?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className={styles.layout}>
      <a href="#content" className={styles.skip}>Перейти к содержимому</a>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link to="/" className={styles.logo}>Выставки Беларуси</Link>
          <nav aria-label="Основная навигация">
            <ul className={styles.nav}>
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className={({ isActive }) => (isActive ? styles.active : undefined)}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main id="content" className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
