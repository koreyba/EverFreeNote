declare module 'lucide-react-native' {
  import type { ComponentType } from 'react'
  import type { ColorValue, StyleProp, ViewStyle } from 'react-native'

  type LucideProps = {
    color?: ColorValue
    size?: number
    strokeWidth?: number
    style?: StyleProp<ViewStyle>
  }

  type LucideIcon = ComponentType<LucideProps>

  export const AlertCircle: LucideIcon
  export const CheckCircle2: LucideIcon
  export const CheckSquare: LucideIcon
  export const ExternalLink: LucideIcon
  export const Plus: LucideIcon
  export const RefreshCw: LucideIcon
  export const Square: LucideIcon
  export const X: LucideIcon
  export const Trash2: LucideIcon
  export const ChevronLeft: LucideIcon
  export const Undo2: LucideIcon
  export const Redo2: LucideIcon
  export const MoreVertical: LucideIcon
  export const Copy: LucideIcon
  export const Check: LucideIcon
  export const Database: LucideIcon
  export const Globe: LucideIcon
  export const Share2: LucideIcon
  export const Globe2: LucideIcon
  export const RotateCcw: LucideIcon
  export const Moon: LucideIcon
  export const Sun: LucideIcon
  export const Search: LucideIcon
  export const ChevronRight: LucideIcon
  export const LogOut: LucideIcon
  export const Monitor: LucideIcon
  export const User: LucideIcon
  export const FileText: LucideIcon
  export const Settings: LucideIcon
  export const Tags: LucideIcon
  export const WifiOff: LucideIcon
  export const CircleAlert: LucideIcon
  export const CircleCheckBig: LucideIcon
  export const Info: LucideIcon
  export const Tag: LucideIcon
  export const ChevronDown: LucideIcon
  export const ChevronUp: LucideIcon
  export const Sparkles: LucideIcon
  export const Circle: LucideIcon
  export const Upload: LucideIcon
  export const Download: LucideIcon
  export const KeyRound: LucideIcon
  export const Key: LucideIcon
  export const Bold: LucideIcon
  export const Italic: LucideIcon
  export const Strikethrough: LucideIcon
  export const Underline: LucideIcon
  export const Minus: LucideIcon
  export const List: LucideIcon
  export const ListOrdered: LucideIcon
  export const Quote: LucideIcon
  export const Code: LucideIcon
}
