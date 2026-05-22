import { RouterProvider } from 'react-router';
import { router } from './routes';
import { OverviewProvider } from './components/OverviewContext';
import { BrightonReplayProvider } from './components/BrightonReplayContext';

export default function App() {
  return (
    <OverviewProvider>
      <BrightonReplayProvider>
        <RouterProvider router={router} />
      </BrightonReplayProvider>
    </OverviewProvider>
  );
}
