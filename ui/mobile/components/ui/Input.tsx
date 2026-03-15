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
  disabled?: boolean
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, containerStyle, style, disabled, editable, ...props }, ref) => {
    const { colors } = useTheme()
    const hasError = Boolean(error)
    const isEditable = disabled ? false : editable

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
              minHeight: 48,
              borderWidth: 1,
              borderColor: hasError ? colors.destructive : colors.border,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 14,
              lineHeight: 20,
              fontFamily: 'Inter_400Regular',
              color: colors.foreground,
              backgroundColor: colors.background,
              textAlignVertical: 'center',
              opacity: isEditable === false ? 0.65 : 1,
            },
            style,
          ]}
          editable={isEditable}
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
