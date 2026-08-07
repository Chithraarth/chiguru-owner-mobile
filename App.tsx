import "react-native-get-random-values";
import React from "react";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./src/lib/queryClient";
import { LanguageProvider } from "./src/lib/i18n";
import { RootNavigator } from "./src/navigation/RootNavigator";

// Show the reminder as a banner + play a sound even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <RootNavigator />
          <StatusBar style="auto" />
        </LanguageProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
