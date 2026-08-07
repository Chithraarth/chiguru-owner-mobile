import { useCallback, useEffect, useRef, useState } from "react";
import { getOrCreateDeviceId, describeDevice } from "../../../lib/device";
import { registerDevice } from "../../../api/endpoints/auth";
import { ApiError } from "../../../api/errors";
import { useSessionStore } from "../../../store/sessionStore";
import type { DeviceInfo } from "../../../types/api";

const REGISTER_INTERVAL_MS = 60_000;

export function useDeviceRegistration(enabled: boolean) {
  const [blocked, setBlocked] = useState(false);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [maxDevices, setMaxDevices] = useState(2);
  const setDeviceId = useSessionStore((s) => s.setDeviceId);
  const epochRef = useRef(0);

  const attempt = useCallback(async () => {
    const myEpoch = ++epochRef.current;
    try {
      const deviceId = await getOrCreateDeviceId();
      setDeviceId(deviceId);
      await registerDevice(deviceId, describeDevice());
      if (myEpoch === epochRef.current) setBlocked(false);
    } catch (err) {
      if (myEpoch !== epochRef.current) return;
      if (err instanceof ApiError && err.is("device_limit")) {
        const body = err.body as { devices?: DeviceInfo[]; maxDevices?: number };
        setDevices(body.devices ?? []);
        setMaxDevices(body.maxDevices ?? 2);
        setBlocked(true);
      }
      // Any other failure (offline/unreachable) fails open - never lock a
      // farmer out in the field, matching the web app's DeviceGate.
    }
  }, [setDeviceId]);

  useEffect(() => {
    if (!enabled) return;
    attempt();
    const interval = setInterval(attempt, REGISTER_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enabled, attempt]);

  return { blocked, devices, maxDevices, recheck: attempt };
}
