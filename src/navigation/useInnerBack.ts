import { useEffect, useRef } from "react";

/**
 * While a screen shows one of its own sub-views (a vendor's page, one board
 * of the hire screen...), the header's back button and Android's back button
 * close that sub-view first instead of leaving the screen.
 */
export function useInnerBack(navigation: any, active: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  useEffect(() => {
    if (!active) return;
    return navigation.addListener("beforeRemove", (e: any) => {
      // Only intercept going back, not a reset or a jump elsewhere.
      if (e.data.action.type !== "GO_BACK" && e.data.action.type !== "POP") return;
      e.preventDefault();
      onBackRef.current();
    });
  }, [navigation, active]);
}
