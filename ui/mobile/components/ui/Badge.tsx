import type { ReactNode } from 'react'
import { View, Text, type ViewStyle, type TextStyle } from 'react-native'
import { useTheme } from '@ui/mobile/providers'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  style?: ViewStyle
  textStyle?: TextStyle
}

const getVariantStyles = (
  colors: ReturnType<typeof useTheme>['colors']
): Record<BadgeVariant, { container: ViewStyle; text: TextStyle }> => ({
  default: {
    container: { backgroundColor: colors.primary },
    text: { color: colors.primaryForeground },
  },
  secondary: {
    container: { backgroundColor: colors.secondary },
    text: { color: colors.secondaryForeground },
  },
  destructive: {
    container: { backgroundColor: colors.destructive },
    text: { color: colors.destructiveForeground },
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
    },
    text: { color: colors.foreground },
  },
})

export function Badge({ variant = 'default', children, style, textStyle }: BadgeProps) {
  const { colors } = useTheme()
  const variantStyles = getVariantStyles(colors)
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
