import { Stack } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { Platform } from "react-native";

export default function DashboardLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerTitleStyle: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 16,
        },
        headerShadowVisible: false,
        headerBackTitle: Platform.OS === "ios" ? "Back" : undefined,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="weather" options={{ title: "Weather Analysis" }} />
      <Stack.Screen name="disruption" options={{ title: "Disruption Alerts" }} />
      <Stack.Screen name="driving" options={{ title: "Driving Intelligence" }} />
      <Stack.Screen name="cuisine" options={{ title: "Cuisine Guide" }} />
      <Stack.Screen name="culture" options={{ title: "Cultural Briefing" }} />
      <Stack.Screen name="budget" options={{ title: "Budget Planner" }} />
      <Stack.Screen name="language" options={{ title: "Language Assistant" }} />
    </Stack>
  );
}
