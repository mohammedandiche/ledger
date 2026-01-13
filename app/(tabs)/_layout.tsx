import { Tabs } from 'expo-router';
import { CustomTabBar } from '@/components/navigation/CustomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="budget" />
      <Tabs.Screen name="ledger" />
      <Tabs.Screen name="add" />
      <Tabs.Screen name="accounts" />
      <Tabs.Screen name="payees" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
