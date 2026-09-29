import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SignInScreen } from "../features/auth/screens/SignInScreen";
import { IntroScreen } from "../features/intro/IntroScreen";
import { useWelcomeStore } from "../features/welcome/store/welcomeStore";

const Stack = createNativeStackNavigator();

export function AuthStack() {
  // Read once: after the intro is finished it replaces itself with SignIn.
  const introSeen = useWelcomeStore((s) => s.introSeen);
  const markIntroSeen = useWelcomeStore((s) => s.markIntroSeen);

  return (
    <Stack.Navigator initialRouteName={introSeen ? "SignIn" : "Intro"} screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="Intro">
        {({ navigation }) => (
          <IntroScreen
            onDone={() => {
              markIntroSeen();
              navigation.replace("SignIn");
            }}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="SignIn" component={SignInScreen} />
    </Stack.Navigator>
  );
}
