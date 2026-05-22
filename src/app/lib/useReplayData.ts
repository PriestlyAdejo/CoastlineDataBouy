import { isBrightonDemo } from "./demoMode";
import { useBrightonReplay, type BrightonReplayContextValue } from "../components/BrightonReplayContext";

/** Brighton pages: unified replay clock + snapshot getters; normal mode returns null. */
export function useReplayData(): BrightonReplayContextValue | null {
  const brighton = isBrightonDemo();
  const replay = useBrightonReplay();
  if (!brighton || !replay) return null;
  return replay;
}
