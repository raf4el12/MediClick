'use client'

// Custom input horizontal de Materio, adaptado: la raíz es un <label> para que el
// radio tome su nombre accesible del contenido, y el grid usa la API de MUI 7.

// MUI Imports
import Radio from '@mui/material/Radio'
import Typography from '@mui/material/Typography'
import { styled } from '@mui/material/styles'

// Third-party Imports
import classnames from 'classnames'

// Type Imports
import type { CustomInputHorizontalProps } from './types'

const Root = styled('label', {
  name: 'MuiCustomInputHorizontal',
  slot: 'root'
})(({ theme }) => ({
  blockSize: '100%',
  display: 'flex',
  gap: theme.spacing(1),
  borderRadius: 'var(--mui-shape-borderRadius)',
  cursor: 'pointer',
  position: 'relative',
  alignItems: 'flex-start',
  border: '1px solid var(--mui-palette-customColors-inputBorder)',
  padding: theme.spacing(4),
  color: 'var(--mui-palette-text-primary)',
  transition: theme.transitions.create(['border-color'], {
    duration: theme.transitions.duration.shorter
  }),

  '&:hover': {
    borderColor: 'var(--mui-palette-action-active)'
  },
  '&.active': {
    borderColor: 'var(--mui-palette-primary-main)',
    '& i, & svg': {
      color: 'var(--mui-palette-primary-main) !important'
    }
  },
  '&:has(input:focus-visible)': {
    outline: '2px solid var(--mui-palette-primary-main)',
    outlineOffset: 2
  }
}))

const Title = styled(Typography, {
  name: 'MuiCustomInputHorizontal',
  slot: 'title'
})(({ theme }) => ({
  fontWeight: theme.typography.fontWeightMedium,
  color: 'var(--mui-palette-text-primary) !important'
}))

const Meta = styled(Typography, {
  name: 'MuiCustomInputHorizontal',
  slot: 'meta'
})(({ theme }) => ({
  ...theme.typography.body2,
  color: 'var(--mui-palette-text-secondary) !important'
}))

const Content = styled(Typography, {
  name: 'MuiCustomInputHorizontal',
  slot: 'content'
})(({ theme }) => ({
  ...theme.typography.body2
}))

const RadioInput = styled(Radio, {
  name: 'MuiCustomInputHorizontal',
  slot: 'input'
})(({ theme }) => ({
  marginBlockStart: theme.spacing(-0.25),
  marginInlineStart: theme.spacing(-0.25)
}))

const CustomInputHorizontal = (props: CustomInputHorizontalProps) => {
  // Props
  const { data, name, selected, handleChange, color = 'primary', className } = props

  // Vars
  const { meta, title, value, content } = data
  const isSelected = selected === value

  return (
    <Root className={classnames(className, { active: isSelected })}>
      <RadioInput name={name} color={color} value={value} onChange={() => handleChange(value)} checked={isSelected} />
      <div className='flex flex-col bs-full is-full gap-1.5 mbs-1.5'>
        {(title || meta) && (
          <div className='flex items-start justify-between is-full gap-1.5'>
            {typeof title === 'string' ? <Title>{title}</Title> : title}
            {typeof meta === 'string' ? <Meta>{meta}</Meta> : meta}
          </div>
        )}
        {content && (typeof content === 'string' ? <Content>{content}</Content> : content)}
      </div>
    </Root>
  )
}

export default CustomInputHorizontal
