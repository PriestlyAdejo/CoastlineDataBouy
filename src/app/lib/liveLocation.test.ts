import { describe, expect, it } from "vitest";
import { resolveLiveLocation } from "./liveLocation";

describe("resolveLiveLocation", () => {
  it("labels IP fallback honestly", () => {
    const view = resolveLiveLocation(
      false,
      { source: "ip_fallback", quality: "approximate", lat: 51.5, lon: -0.1 },
      null,
    );
    expect(view.kind).toBe("approximate_ip_fallback");
    expect(view.label).toBe("Approximate IP fallback");
    expect(view.hasCoordinates).toBe(true);
  });

  it("shows live GNSS fix for quectel_at", () => {
    const view = resolveLiveLocation(
      false,
      { source: "quectel_at", quality: "fix", lat: 50.8, lon: -0.1 },
      null,
    );
    expect(view.kind).toBe("live_gnss_fix");
    expect(view.label).toBe("Live GNSS fix");
  });

  it("shows waiting for fix when GNSS present without coordinates", () => {
    const view = resolveLiveLocation(
      false,
      { source: "gnss", quality: "no_fix", reason: "indoor_no_fix" },
      null,
    );
    expect(view.kind).toBe("gnss_waiting_fix");
    expect(view.label).toBe("GNSS present, waiting for fix");
    expect(view.hasCoordinates).toBe(false);
  });

  it("shows no device when quality is no_device", () => {
    const view = resolveLiveLocation(
      false,
      { source: "no_device", quality: "no_device", reason: "no_device" },
      null,
    );
    expect(view.kind).toBe("no_gnss_device");
    expect(view.label).toBe("No GNSS device detected");
  });

  it("does not fake GPS on approximate fallback without coords", () => {
    const view = resolveLiveLocation(
      false,
      { source: "ip_fallback", quality: "approximate" },
      null,
    );
    expect(view.hasCoordinates).toBe(false);
  });
});
