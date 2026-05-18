'use client'

import { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface RevealProps {
  children: ReactNode
  delay?: number
  className?: string
  as?: 'div' | 'article'
  id?: string
}

/**
 * Wraps children in a framer-motion whileInView block (.reveal-up).
 */
export default function Reveal({ children, delay = 0, className = '', as = 'div', id }: RevealProps) {
  const reduceMotion = useReducedMotion()
  const sharedProps = {
    className: `reveal-up ${className}`.trim(),
    id,
    initial: reduceMotion ? { opacity: 1 } : { opacity: 0, y: 28, scale: 0.985 },
    whileInView: reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 },
    viewport: { once: true, margin: "-72px" },
    transition: {
      duration: 0.62,
      ease: [0.16, 1, 0.3, 1] as const,
      delay: reduceMotion ? 0 : delay * 0.08
    },
  }

  if (as === 'article') {
    return (
      <motion.article {...sharedProps}>
        {children}
      </motion.article>
    )
  }

  return (
    <motion.div {...sharedProps}>
      {children}
    </motion.div>
  )
}
