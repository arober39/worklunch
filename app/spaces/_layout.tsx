import { Stack } from 'expo-router';

export default function SpacesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      <Stack.Screen name="join" />
      <Stack.Screen name="edit" />
    </Stack>
  );
}
