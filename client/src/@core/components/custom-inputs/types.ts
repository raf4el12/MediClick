// React Imports
import type { ReactNode } from 'react'

// Type Imports
import type { ThemeColor } from '@core/types'

export type CustomInputHorizontalData = {
  value: string
  title?: ReactNode
  meta?: ReactNode
  content?: ReactNode
}

export type CustomInputHorizontalProps = {
  name: string
  color?: ThemeColor
  className?: string
  data: CustomInputHorizontalData
  selected: string
  handleChange: (value: string) => void
}
