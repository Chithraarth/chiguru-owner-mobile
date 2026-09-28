import React, { useEffect, useRef } from "react";
import NetInfo from "@react-native-community/netinfo";
import * as Notifications from "expo-notifications";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { useAuthListener } from "../features/auth/hooks/useAuth";
import { useDeviceRegistration } from "../features/device-gate/hooks/useDeviceRegistration";
import { DeviceLimitScreen } from "../features/device-gate/screens/DeviceLimitScreen";
import { useEstateStore } from "../features/estate/store/estateStore";
import { useMyEstates } from "../features/estate/hooks/useMyEstates";
import { ChooseEstateScreen } from "../features/estate/screens/ChooseEstateScreen";
import { PendingInvitesScreen } from "../features/estate/screens/PendingInvitesScreen";
import { getMyInvites } from "../api/endpoints/managers";
import { useQuery } from "@tanstack/react-query";
import { useSessionStore } from "../store/sessionStore";
import { useSyncStore } from "../store/syncStore";
import { runSync } from "../lib/syncManager";
import { usePushStore } from "../lib/push";
import { LoadingView } from "../components/StateViews";
import { AuthStack } from "./AuthStack";
import { MainTabs } from "./MainTabs";
import { InviteeStack } from "../features/invitee/InviteeStack";

export function RootNavigator() {
  useAuthListener();

  const user = useSessionStore((s) => s.user);
  const authLoading = useSessionStore((s) => s.authLoading);
  const hydrateEstate = useEstateStore((s) => s.hydrate);
  const estateHydrated = useEstateStore((s) => s.hydrated);
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const setActiveEstate = useEstateStore((s) => s.setActiveEstate);
  const setOnline = useSyncStore((s) => s.setOnline);

  const { blocked, devices, maxDevices, recheck } = useDeviceRegistration(!!user);
  const hydratePush = usePushStore((s) => s.hydrate);
  const navRef = useRef<NavigationContainerRef<any>>(null);

  // Every estate this person may act on (their own + anything they're
  // invited to), so we know up front whether a Choose Estate step is even
  // needed, and whether the active one is their own or an invited farm.
  const myEstatesQuery = useMyEstates();
  const rememberedRelationship = useEstateStore((s) => s.activeRelationship);
  const rememberRelationship = useEstateStore((s) => s.rememberRelationship);
  const liveRelationship = myEstatesQuery.data?.find((e) => e.id === activeEstateId)?.relationship;
  // Live answer when /me/estates loaded; the remembered one when it couldn't
  // (offline start), so an invitee in the field still gets invitee screens.
  const activeRelationship = myEstatesQuery.data ? liveRelationship : rememberedRelationship;
  const isInvitedEstate = activeRelationship === "invited";

  useEffect(() => {
    if (liveRelationship) rememberRelationship(liveRelationship);
  }, [liveRelationship, rememberRelationship]);

  // Plan reminders belong to the farm's Owner - never register this device
  // for them while working on someone else's farm.
  useEffect(() => {
    if (user && !isInvitedEstate) hydratePush();
  }, [user, isInvitedEstate, hydratePush]);

  // Tapping the Year Plan reminder notification jumps straight to the plan.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.notification.request.content.data?.type === "plan-reminder") {
        navRef.current?.navigate("DashboardTab", { screen: "YearPlan" });
      }
    });
    return () => sub.remove();
  }, []);

  // Checked once per sign-in, before anything else can render - an invite
  // gives no access at all until explicitly accepted (see
  // PendingInvitesScreen and the backend's routes/invites.ts).
  const myInvitesQuery = useQuery({ queryKey: ["my-invites"], queryFn: getMyInvites, enabled: !!user });

  useEffect(() => {
    hydrateEstate();
  }, [hydrateEstate]);

  // Auto-pick the (only) estate when there's exactly one relationship, or
  // self-heal a stale activeEstateId (deleted farm, revoked invite) back to
  // the first available one - only ChooseEstateScreen decides between
  // several, everything else should never block on a choice nobody actually
  // has to make.
  useEffect(() => {
    const myEstates = myEstatesQuery.data;
    if (!myEstates) return;
    const stillValid = myEstates.some((e) => e.id === activeEstateId);
    if (stillValid) return;
    if (myEstates.length === 1) {
      setActiveEstate(myEstates[0].id);
    } else if (myEstates.length === 0 && activeEstateId != null) {
      // Nothing left to act on (farm deleted, invite revoked) - don't keep
      // sending a stale X-Estate-Id.
      setActiveEstate(null);
    }
  }, [myEstatesQuery.data, activeEstateId, setActiveEstate]);

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

  if (myEstatesQuery.isLoading || myInvitesQuery.isLoading) {
    return <LoadingView label="Loading your farms..." />;
  }

  // Any invite this person hasn't yet accepted/declined must be resolved
  // before anything else - it never contributes to myEstates until then, so
  // showing this first (rather than after Choose Estate) means a first-time
  // invitee is never asked to "choose" between farms they haven't agreed to
  // help with yet.
  if ((myInvitesQuery.data?.length ?? 0) > 0) {
    return (
      <PendingInvitesScreen
        onDone={() => {
          myEstatesQuery.refetch();
        }}
      />
    );
  }

  // Someone with more than one estate relationship (their own farm(s) and/or
  // one or more they've been invited to) must pick which one to work on
  // before anything else can load - X-Estate-Id is what the API uses to
  // resolve which Owner every subsequent request acts for. Re-shown whenever
  // activeEstateId doesn't point at something in the current list (revoked
  // invite, deleted farm, or simply never chosen yet).
  const myEstates = myEstatesQuery.data ?? [];
  const needsEstateChoice = myEstates.length > 1 && !myEstates.some((e) => e.id === activeEstateId);
  if (needsEstateChoice) {
    return <ChooseEstateScreen onChosen={() => myEstatesQuery.refetch()} />;
  }

  // Setting up a farm is NOT mandatory (matches chiguru-owner-web - a new
  // owner lands straight on the dashboard, which shows its own "set up your
  // farm" prompt). We only needed to make sure myEstatesQuery has actually
  // settled before rendering, so screens gated on activeEstateId don't spin
  // forever waiting on a fetch nobody triggered.
  // An invited farm gets exactly the old Manager app's screens; your own
  // farm gets the full Owner app. Keyed so switching resets navigation.
  if (isInvitedEstate) {
    return (
      <NavigationContainer key="invitee">
        <InviteeStack />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer key="owner" ref={navRef}>
      <MainTabs />
    </NavigationContainer>
  );
}
