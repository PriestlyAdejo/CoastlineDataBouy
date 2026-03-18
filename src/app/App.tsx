import { RouterProvider } from 'react-router';
import { router } from './routes';
import { OverviewProvider } from './components/OverviewContext';

export default function App() {
  return (
    <OverviewProvider>
      <RouterProvider router={router} />
    </OverviewProvider>
  );
}
