import { forwardRef } from 'react'
import {
  TextInput,
  type TextInputProps,
  type ViewStyle,
  View,
  Text,
} from 'react-native'
import { useTheme } from '@ui/mobile/providers'

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  containerStyle?: ViewStyle
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, containerStyle, style, ...props }, ref) => {
    const { colors } = useTheme()
    const hasError = Boolean(error)

    return (
      <View style={containerStyle}>
        {label && (
          <Text
            style={{
              fontSize: 14,
              fontFamily: 'Inter_500Medium',
              color: colors.foreground,
              marginBottom: 6,
            }}
          >
            {label}
          </Text>
        )}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.mutedForeground}
          style={[
            {
              height: 40,
              borderWidth: 1,
              borderColor: hasError ? colors.destructive : colors.border,
              borderRadius: 8,
              paddingHorizontal: 12,
              fontSize: 14,
              fontFamily: 'Inter_400Regular',
              color: colors.foreground,
              backgroundColor: colors.background,
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
              color: colors.destructive,
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
