declare module "react-color" {
  import * as React from "react"

  export interface ColorResult {
    hex: string
  }

  export interface TwitterPickerProps {
    color?: string
    onChange?: (color: ColorResult) => void
  }

  export class TwitterPicker extends React.Component<TwitterPickerProps> {}
}
