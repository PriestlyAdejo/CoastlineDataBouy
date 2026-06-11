import { Outlet } from "react-router";
import { OverviewProvider } from "./OverviewContext";
import { BrightonReplayProvider } from "./BrightonReplayContext";
import { LiveNodeProvider } from "./LiveNodeProvider";

/** App-wide providers inside the router so replay ticks do not re-mount RouterProvider. */
export function RootProviders() {
  return (
    <OverviewProvider>
      <BrightonReplayProvider>
        <LiveNodeProvider>
          <Outlet />
        </LiveNodeProvider>
      </BrightonReplayProvider>
    </OverviewProvider>
  );
}
