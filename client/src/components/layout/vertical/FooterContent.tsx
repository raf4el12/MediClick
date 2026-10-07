'use client'

// Third-party Imports
import classnames from 'classnames'

// Util Imports
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

const FooterContent = () => {
  return (
    <div className={classnames(verticalLayoutClasses.footerContent, 'flex items-center justify-between flex-wrap gap-4')}>
      <p>{`© ${new Date().getFullYear()} MediClick. Todos los derechos reservados.`}</p>
    </div>
  )
}

export default FooterContent
