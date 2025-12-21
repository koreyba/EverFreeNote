import { View, Text, type ViewStyle, type TextStyle } from 'react-native'
import { colors } from '@ui/mobile/lib/theme'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  style?: ViewStyle
  textStyle?: TextStyle
}

const variantStyles: Record<BadgeVariant, { container: ViewStyle; text: TextStyle }> = {
  default: {
    container: { backgroundColor: colors.light.primary },
    text: { color: colors.light.primaryForeground },
  },
  secondary: {
    container: { backgroundColor: colors.light.secondary },
    text: { color: colors.light.secondaryForeground },
  },
  destructive: {
    container: { backgroundColor: colors.light.destructive },
    text: { color: colors.light.destructiveForeground },
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.light.border,
    },
    text: { color: colors.light.foreground },
  },
}

export function Badge({ variant = 'default', children, style, textStyle }: BadgeProps) {
  const variantStyle = variantStyles[variant]

  return (
    <View
      style={[
        {
          paddingHorizontal: 10,
          paddingVertical: 2,
          borderRadius: 9999,
          alignSelf: 'flex-start',
        },
        variantStyle.container,
        style,
      ]}
    >
      {typeof children === 'string' ? (
        <Text
          style={[
            {
              fontSize: 12,
              fontFamily: 'Inter_500Medium',
            },
            variantStyle.text,
            textStyle,
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  )
}
