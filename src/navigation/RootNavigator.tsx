import React, { useEffect, useRef } from "react";
import NetInfo from "@react-native-community/netinfo";
import * as Notifications from "expo-notifications";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { useAuthListener } from "../features/auth/hooks/useAuth";
import { useDeviceRegistration } from "../features/device-gate/hooks/useDeviceRegistration";
import { DeviceLimitScreen } from "../features/device-gate/screens/DeviceLimitScreen";
import { useEstateStore } from "../features/estate/store/estateStore";
import { useEstates } from "../features/estate/hooks/useEstates";
import { useSessionStore } from "../store/sessionStore";
import { useSyncStore } from "../store/syncStore";
import { runSync } from "../lib/syncManager";
import { usePushStore } from "../lib/push";
import { LoadingView } from "../components/StateViews";
import { AuthStack } from "./AuthStack";
import { MainTabs } from "./MainTabs";

export function RootNavigator() {
  useAuthListener();

  const user = useSessionStore((s) => s.user);
  const authLoading = useSessionStore((s) => s.authLoading);
  const hydrateEstate = useEstateStore((s) => s.hydrate);
  const estateHydrated = useEstateStore((s) => s.hydrated);
  const setOnline = useSyncStore((s) => s.setOnline);

  const { blocked, devices, maxDevices, recheck } = useDeviceRegistration(!!user);
  const hydratePush = usePushStore((s) => s.hydrate);
  const navRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    if (user) hydratePush();
  }, [user, hydratePush]);

  // Tapping the Year Plan reminder notification jumps straight to the plan.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.notification.request.content.data?.type === "plan-reminder") {
        navRef.current?.navigate("DashboardTab", { screen: "YearPlan" });
      }
    });
    return () => sub.remove();
  }, []);

  // Always mounted once signed in - this is what actually fetches /estates
  // and self-heals the active estate id (e.g. after the stored one was
  // deleted). Without this running somewhere at the root, activeEstateId
  // never gets populated and every screen gated on it spins forever.
  const estatesQuery = useEstates();

  useEffect(() => {
    hydrateEstate();
  }, [hydrateEstate]);

  useEffect(() => {
    if (!user) return;
    runSync();
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(state.isConnected !== false);
      if (state.isConnected) runSync();
    });
    return unsubscribe;
  }, [user, setOnline]);

  if (authLoading || (user && !estateHydrated)) {
    return <LoadingView label="Loading..." />;
  }

  if (!user) {
    return (
      <NavigationContainer>
        <AuthStack />
      </NavigationContainer>
    );
  }

  if (blocked) {
    return <DeviceLimitScreen devices={devices} maxDevices={maxDevices} onFreedSlot={recheck} />;
  }

  if (estatesQuery.isLoading) {
    return <LoadingView label="Loading your farms..." />;
  }

  // Setting up a farm is NOT mandatory (matches chiguru-owner-web - a new
  // owner lands straight on the dashboard, which shows its own "set up your
  // farm" prompt). We only needed to make sure estatesQuery has actually
  // settled before rendering, so screens gated on activeEstateId don't spin
  // forever waiting on a fetch nobody triggered - see useEstates() above.
  return (
    <NavigationContainer ref={navRef}>
      <MainTabs />
    </NavigationContainer>
  );
}
