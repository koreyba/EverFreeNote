import React, { useEffect, useMemo, useState } from 'react'
import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Bold,
  Italic,
  Strikethrough,
  Underline,
  Minus,
  List,
  ListOrdered,
  Quote,
  Code,
} from 'lucide-react-native'
import { useTheme } from '@ui/mobile/providers'
import { Button, Input } from '@ui/mobile/components/ui'

export const TOOLBAR_CONTENT_HEIGHT = 48

type Props = {
  onCommand: (method: string, args?: unknown[]) => void
  hasSelection?: boolean
  onMenuVisibilityChange?: (visible: boolean) => void
}

type MenuKey = 'heading' | 'align' | 'fontSize' | 'link' | 'image' | null

const FONT_SIZE_OPTIONS = ['10', '11', '12', '13', '14', '15', '18', '24', '30', '36']

export const EditorToolbar = ({ onCommand, hasSelection = false, onMenuVisibilityChange }: Props) => {

type ToolbarButtonProps = {
  icon: React.ElementType
  onPress: () => void
  accessibilityLabel: string
  styles: ToolbarStyles
  iconColor: string
}

const ToolbarButton = ({ icon: Icon, onPress, accessibilityLabel, styles, iconColor }: ToolbarButtonProps) => (
  <Pressable
    accessibilityLabel={accessibilityLabel}
    style={({ pressed }) => [
      styles.button,
      pressed && styles.buttonPressed,
    ]}
    onPress={onPress}
  >
    <Icon size={20} color={iconColor} />
  </Pressable>
)

type TextToolbarButtonProps = {
  label: string
  onPress: () => void
  accessibilityLabel: string
  active?: boolean
  styles: ToolbarStyles
}

const TextToolbarButton = ({ label, onPress, accessibilityLabel, active = false, styles }: TextToolbarButtonProps) => (
  <Pressable
    accessibilityLabel={accessibilityLabel}
    style={({ pressed }) => [
      styles.textButton,
      active && styles.textButtonActive,
      pressed && styles.buttonPressed,
    ]}
    onPress={onPress}
  >
    <Text style={styles.textButtonLabel}>{label}</Text>
  </Pressable>
)

  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [activeMenu, setActiveMenu] = useState<MenuKey>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  useEffect(() => {
    if (activeMenu !== 'link') {
      setLinkUrl('')
    }
    if (activeMenu !== 'image') {
      setImageUrl('')
    }
  }, [activeMenu])

  useEffect(() => {
    onMenuVisibilityChange?.(activeMenu !== null)
  }, [activeMenu, onMenuVisibilityChange])

  const runCommand = (method: string, args?: unknown[]) => {
    onCommand(method, args)
  }

  const closeMenu = () => setActiveMenu(null)

  const toggleMenu = (menu: Exclude<MenuKey, null>) => {
    setActiveMenu((current) => (current === menu ? null : menu))
  }

  const openMenu = (menu: Exclude<MenuKey, null>) => {
    const isOpening = activeMenu !== menu
    if (isOpening && (menu === 'link' || menu === 'image')) {
      // Dismiss editor selection handles/native action menu before opening URL forms.
      runCommand('blur')
    }
    toggleMenu(menu)
  }

  const handleLinkApply = () => {
    const normalized = linkUrl.trim()
    if (!normalized) return
    runCommand('setLinkUrl', [normalized])
    closeMenu()
  }

  const handleLinkRemove = () => {
    runCommand('setLinkUrl', [''])
    closeMenu()
  }

  const handleImageApply = () => {
    const normalized = imageUrl.trim()
    if (!normalized) return
    runCommand('insertImageUrl', [normalized])
    closeMenu()
  }

  const renderMenu = () => {
    if (activeMenu === null) return null

    if (activeMenu === 'heading') {
      return (
        <View style={styles.menuCard}>
          <Text style={styles.menuTitle}>Heading</Text>
          <View style={styles.optionRow}>
            {[1, 2, 3].map((level) => (
              <Button
                key={level}
                variant="secondary"
                size="sm"
                onPress={() => {
                  runCommand('toggleHeadingLevel', [level])
                  closeMenu()
                }}
                style={styles.optionButton}
              >
                {`H${level}`}
              </Button>
            ))}
          </View>
        </View>
      )
    }

    if (activeMenu === 'align') {
      return (
        <View style={styles.menuCard}>
          <Text style={styles.menuTitle}>Alignment</Text>
          <View style={styles.optionRow}>
            {[
              { label: 'Left', value: 'left' },
              { label: 'Center', value: 'center' },
              { label: 'Right', value: 'right' },
            ].map((option) => (
              <Button
                key={option.value}
                variant="secondary"
                size="sm"
                onPress={() => {
                  runCommand('setTextAlign', [option.value])
                  closeMenu()
                }}
                style={styles.optionButton}
              >
                {option.label}
              </Button>
            ))}
          </View>
        </View>
      )
    }

    if (activeMenu === 'fontSize') {
      return (
        <View style={styles.menuCard}>
          <Text style={styles.menuTitle}>Font size</Text>
          <View style={styles.optionGrid}>
            {FONT_SIZE_OPTIONS.map((size) => (
              <Button
                key={size}
                variant="secondary"
                size="sm"
                onPress={() => {
                  runCommand('setFontSize', [`${size}pt`])
                  closeMenu()
                }}
                style={styles.optionGridButton}
              >
                {size}
              </Button>
            ))}
          </View>
        </View>
      )
    }

    if (activeMenu === 'link') {
      return (
        <View style={styles.menuCard}>
          <Text style={styles.menuTitle}>Link</Text>
          <Input
            value={linkUrl}
            onChangeText={setLinkUrl}
            placeholder="https://example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.menuInput}
          />
          <View style={styles.formActions}>
            <Button variant="ghost" size="sm" onPress={closeMenu} style={styles.formButton}>
              Cancel
            </Button>
            <Button variant="outline" size="sm" onPress={handleLinkRemove} style={styles.formButton}>
              Remove
            </Button>
            <Button size="sm" onPress={handleLinkApply} disabled={linkUrl.trim().length === 0} style={styles.formButton}>
              Apply
            </Button>
          </View>
        </View>
      )
    }

    return (
      <View style={styles.menuCard}>
        <Text style={styles.menuTitle}>Image URL</Text>
        <Input
          value={imageUrl}
          onChangeText={setImageUrl}
          placeholder="https://example.com/image.png"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={styles.menuInput}
        />
        <View style={styles.formActions}>
          <Button variant="ghost" size="sm" onPress={closeMenu} style={styles.formButton}>
            Cancel
          </Button>
          <Button size="sm" onPress={handleImageApply} disabled={imageUrl.trim().length === 0} style={styles.formButton}>
            Insert
          </Button>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {activeMenu && (
        <View style={[styles.menuContainer, { bottom: TOOLBAR_CONTENT_HEIGHT + insets.bottom + 8 }]}>
          {renderMenu()}
        </View>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ToolbarButton icon={Bold} onPress={() => runCommand('toggleBold')} accessibilityLabel="Bold" styles={styles} iconColor={colors.foreground} />
        <ToolbarButton icon={Italic} onPress={() => runCommand('toggleItalic')} accessibilityLabel="Italic" styles={styles} iconColor={colors.foreground} />
        <ToolbarButton icon={Strikethrough} onPress={() => runCommand('toggleStrike')} accessibilityLabel="Strikethrough" styles={styles} iconColor={colors.foreground} />
        <ToolbarButton icon={Underline} onPress={() => runCommand('toggleUnderline')} accessibilityLabel="Underline" styles={styles} iconColor={colors.foreground} />
        <View style={styles.divider} />
        <TextToolbarButton
          label="H"
          active={activeMenu === 'heading'}
          accessibilityLabel="Open heading menu"
          onPress={() => openMenu('heading')}
          styles={styles}
        />
        <TextToolbarButton
          label="Align"
          active={activeMenu === 'align'}
          accessibilityLabel="Open alignment menu"
          onPress={() => openMenu('align')}
          styles={styles}
        />
        <TextToolbarButton
          label="Size"
          active={activeMenu === 'fontSize'}
          accessibilityLabel="Open font size menu"
          onPress={() => openMenu('fontSize')}
          styles={styles}
        />
        <TextToolbarButton
          label="Clear"
          accessibilityLabel="Clear formatting"
          onPress={() => {
            closeMenu()
            runCommand('clearFormatting')
          }}
          styles={styles}
        />
        <ToolbarButton icon={Minus} onPress={() => runCommand('setHorizontalRule')} accessibilityLabel="Horizontal rule" styles={styles} iconColor={colors.foreground} />
        <View style={styles.divider} />
        <ToolbarButton icon={List} onPress={() => runCommand('toggleBulletList')} accessibilityLabel="Bullet list" styles={styles} iconColor={colors.foreground} />
        <ToolbarButton icon={ListOrdered} onPress={() => runCommand('toggleOrderedList')} accessibilityLabel="Ordered list" styles={styles} iconColor={colors.foreground} />
        <TextToolbarButton
          label="Task"
          accessibilityLabel="Task list"
          onPress={() => runCommand('toggleTaskList')}
          styles={styles}
        />
        <ToolbarButton icon={Quote} onPress={() => runCommand('toggleBlockquote')} accessibilityLabel="Blockquote" styles={styles} iconColor={colors.foreground} />
        <ToolbarButton icon={Code} onPress={() => runCommand('toggleCodeBlock')} accessibilityLabel="Code block" styles={styles} iconColor={colors.foreground} />
        <View style={styles.divider} />
        <TextToolbarButton
          label="Link"
          active={activeMenu === 'link'}
          accessibilityLabel="Open link menu"
          onPress={() => openMenu('link')}
          styles={styles}
        />
        <TextToolbarButton
          label="Image"
          active={activeMenu === 'image'}
          accessibilityLabel="Open image menu"
          onPress={() => openMenu('image')}
          styles={styles}
        />
        <View style={styles.divider} />
        <Pressable
          accessibilityLabel="Apply as Markdown"
          accessibilityState={{ disabled: !hasSelection }}
          disabled={!hasSelection}
          style={({ pressed }) => [
            styles.button,
            pressed && hasSelection && styles.buttonPressed,
            !hasSelection && styles.buttonDisabled,
          ]}
          onPress={() => runCommand('applySelectionAsMarkdown')}
        >
          <Text style={styles.mdLabel}>MD</Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  scrollContent: {
    paddingHorizontal: 8,
    alignItems: 'center',
    height: TOOLBAR_CONTENT_HEIGHT,
  },
  button: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    borderRadius: 8,
  },
  textButton: {
    minWidth: 48,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  textButtonActive: {
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textButtonLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.foreground,
  },
  buttonPressed: {
    backgroundColor: colors.accent,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  mdLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.foreground,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  menuContainer: {
    position: 'absolute',
    left: 8,
    right: 8,
    zIndex: 5,
  },
  menuCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  menuTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.foreground,
    marginBottom: 10,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionGridButton: {
    minWidth: 54,
  },
  menuInput: {
    marginBottom: 10,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  formButton: {
    minWidth: 84,
  },
})
