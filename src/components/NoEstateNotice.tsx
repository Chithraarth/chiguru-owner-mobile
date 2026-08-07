import React from "react";
import { EmptyState } from "./StateViews";

/** Shown on estate-scoped tabs when no farm has been set up yet (onboarding is optional - see Dashboard). */
export function NoEstateNotice() {
  return (
    <EmptyState
      title="Set up your farm first"
      subtitle="Head to the Home tab to create your farm, then come back here."
    />
  );
}
