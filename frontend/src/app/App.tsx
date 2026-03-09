import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import AppShell            from '../components/layout/AppShell';
import HomePage            from '../pages/HomePage';
import TracesDashboardPage from '../pages/TracesDashboardPage';
import TraceDetailPage     from '../pages/TraceDetailPage';
import ExperimentsPage     from '../pages/ExperimentsPage';
import ExperimentDetailPage from '../pages/ExperimentDetailPage';
import DatasetsPage        from '../pages/DatasetsPage';
import EvaluationCenterPage from '../pages/EvaluationCenterPage';
import SystemInsightsPage  from '../pages/SystemInsightsPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true,                         element: <HomePage /> },
      { path: 'traces',                      element: <TracesDashboardPage /> },
      { path: 'traces/:traceId',             element: <TraceDetailPage /> },
      { path: 'experiments',                 element: <ExperimentsPage /> },
      { path: 'experiments/:experimentId',   element: <ExperimentDetailPage /> },
      { path: 'datasets',                    element: <DatasetsPage /> },
      { path: 'evaluation',                  element: <EvaluationCenterPage /> },
      { path: 'insights',                    element: <SystemInsightsPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
