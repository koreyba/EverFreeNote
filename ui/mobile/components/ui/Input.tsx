import { forwardRef } from 'react'
import {
  TextInput,
  type TextInputProps,
  type ViewStyle,
  View,
  Text,
} from 'react-native'
import { colors } from '@ui/mobile/lib/theme'

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  containerStyle?: ViewStyle
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, containerStyle, style, ...props }, ref) => {
    const hasError = Boolean(error)

    return (
      <View style={containerStyle}>
        {label && (
          <Text
            style={{
              fontSize: 14,
              fontFamily: 'Inter_500Medium',
              color: colors.light.foreground,
              marginBottom: 6,
            }}
          >
            {label}
          </Text>
        )}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.light.mutedForeground}
          style={[
            {
              height: 40,
              borderWidth: 1,
              borderColor: hasError ? colors.light.destructive : colors.light.border,
              borderRadius: 8,
              paddingHorizontal: 12,
              fontSize: 14,
              fontFamily: 'Inter_400Regular',
              color: colors.light.foreground,
              backgroundColor: colors.light.background,
            },
            style,
          ]}
          {...props}
        />
        {error && (
          <Text
            style={{
              fontSize: 12,
              fontFamily: 'Inter_400Regular',
              color: colors.light.destructive,
              marginTop: 4,
            }}
          >
            {error}
          </Text>
        )}
      </View>
    )
  }
)

Input.displayName = 'Input'
