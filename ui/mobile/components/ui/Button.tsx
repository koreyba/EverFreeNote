import type { ReactNode } from 'react'
import {
  Pressable,
  Text,
  type PressableProps,
  type ViewStyle,
  type TextStyle,
  ActivityIndicator,
} from 'react-native'
import { colors } from '@ui/mobile/lib/theme'

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: ReactNode
  style?: ViewStyle
  textStyle?: TextStyle
}

const variantStyles: Record<ButtonVariant, { base: ViewStyle; pressed: ViewStyle; text: TextStyle }> = {
  default: {
    base: { backgroundColor: colors.light.primary },
    pressed: { backgroundColor: '#15803d' }, // green-700
    text: { color: colors.light.primaryForeground },
  },
  destructive: {
    base: { backgroundColor: colors.light.destructive },
    pressed: { backgroundColor: '#b91c1c' }, // red-700
    text: { color: colors.light.destructiveForeground },
  },
  outline: {
    base: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.light.border,
    },
    pressed: { backgroundColor: colors.light.accent },
    text: { color: colors.light.foreground },
  },
  secondary: {
    base: { backgroundColor: colors.light.secondary },
    pressed: { backgroundColor: '#dcfce7' }, // green-100
    text: { color: colors.light.secondaryForeground },
  },
  ghost: {
    base: { backgroundColor: 'transparent' },
    pressed: { backgroundColor: colors.light.accent },
    text: { color: colors.light.foreground },
  },
}

const sizeStyles: Record<ButtonSize, { container: ViewStyle; text: TextStyle }> = {
  default: {
    container: { height: 40, paddingHorizontal: 16, paddingVertical: 8 },
    text: { fontSize: 14 },
  },
  sm: {
    container: { height: 36, paddingHorizontal: 12, paddingVertical: 6 },
    text: { fontSize: 13 },
  },
  lg: {
    container: { height: 44, paddingHorizontal: 24, paddingVertical: 10 },
    text: { fontSize: 16 },
  },
  icon: {
    container: { height: 40, width: 40, padding: 0 },
    text: { fontSize: 14 },
  },
}

export function Button({
  variant = 'default',
  size = 'default',
  loading,
  children,
  style,
  textStyle,
  disabled,
  ...props
}: ButtonProps) {
  const variantStyle = variantStyles[variant]
  const sizeStyle = sizeStyles[size]
  const isDisabled = disabled === true || loading === true

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          borderRadius: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isDisabled ? 0.5 : 1,
        },
        variantStyle.base,
        sizeStyle.container,
        pressed && variantStyle.pressed,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantStyle.text.color as string}
        />
      ) : typeof children === 'string' ? (
        <Text
          style={[
            {
              fontFamily: 'Inter_600SemiBold',
              textAlign: 'center',
            },
            variantStyle.text,
            sizeStyle.text,
            textStyle,
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  )
}
