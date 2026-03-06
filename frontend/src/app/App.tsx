import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import HomePage from '../pages/HomePage';
import TracesDashboardPage from '../pages/TracesDashboardPage';
import TraceDetailPage from '../pages/TraceDetailPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true,              element: <HomePage /> },
      { path: 'traces',           element: <TracesDashboardPage /> },
      { path: 'traces/:traceId',  element: <TraceDetailPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
