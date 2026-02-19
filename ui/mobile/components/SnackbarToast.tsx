import { View, Text, StyleSheet } from 'react-native'
import type { ToastConfigParams } from 'react-native-toast-message'
import { useTheme } from '@ui/mobile/providers'

export function SnackbarToast({ text1, type }: ToastConfigParams<unknown>) {
  const { colors } = useTheme()
  const isError = type === 'error'

  return (
    <View style={[
      styles.container,
      { backgroundColor: isError ? colors.destructive : colors.foreground },
    ]}>
      <Text style={[
        styles.text,
        { color: isError ? colors.destructiveForeground : colors.background },
      ]}>
        {text1}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  text: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
})
