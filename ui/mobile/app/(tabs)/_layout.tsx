import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#4285F4',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Заметки',
          tabBarLabel: 'Заметки',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Настройки',
          tabBarLabel: 'Настройки',
        }}
      />
    </Tabs>
  )
}
