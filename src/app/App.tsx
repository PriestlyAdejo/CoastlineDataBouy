import { RouterProvider } from 'react-router';
import { router } from './routes';
import { OverviewProvider } from './components/OverviewContext';
import { BrightonReplayProvider } from './components/BrightonReplayContext';
import { LiveNodeProvider } from './components/LiveNodeProvider';

export default function App() {
  return (
    <OverviewProvider>
      <BrightonReplayProvider>
        <LiveNodeProvider>
          <RouterProvider router={router} />
        </LiveNodeProvider>
      </BrightonReplayProvider>
    </OverviewProvider>
  );
}
