declare module 'react-color' {
  import * as React from 'react'

  export interface ColorResult {
    hex: string
    rgb: { r: number; g: number; b: number; a: number }
    hsl: { h: number; s: number; l: number; a: number }
  }

  export interface ColorProps {
    color?: string
    onChange?: (color: ColorResult) => void
    onChangeComplete?: (color: ColorResult) => void
    className?: string
  }

  export const TwitterPicker: React.ComponentType<ColorProps>
  export const ChromePicker: React.ComponentType<ColorProps>
  export const SketchPicker: React.ComponentType<ColorProps>
}
