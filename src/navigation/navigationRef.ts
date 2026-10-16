import { createNavigationContainerRef } from "@react-navigation/native";

/** The signed-in Owner app's navigator, for code outside any screen (notifications, plan prompts). */
export const navigationRef = createNavigationContainerRef<any>();
