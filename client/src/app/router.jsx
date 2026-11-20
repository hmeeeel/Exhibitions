import { createBrowserRouter, Link, useRouteError } from 'react-router-dom';
import { Layout } from '../components/Layout.jsx';
import { CatalogPage } from '../pages/CatalogPage.jsx';
import { ExhibitionPage } from '../pages/ExhibitionPage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';

// Ошибка отрисовки страницы не должна оставлять пустой экран
function RouteError() {
  const error = useRouteError();
  console.error(error);
  return (
    <div style={{ padding: 24 }} role="alert">
      <h1>Что-то пошло не так</h1>
      <p>Произошла непредвиденная ошибка. Попробуйте обновить страницу.</p>
      <Link to="/">Перейти в каталог</Link>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <CatalogPage /> },
      { path: 'exhibitions/:id', element: <ExhibitionPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
