'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null)

  const { scrollY } = useScroll()
  const yVideo = useTransform(scrollY, [0, 1200], [0, 350])

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    const target = document.querySelector(href)
    if (target) {
      const top = target.getBoundingClientRect().top + window.scrollY - 96
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  const containerVars = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } }
  }

  const textVars = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } }
  }

  return (
    <section className="hero" id="hero" aria-label="Hero" ref={heroRef}>
      <motion.div className="hero-video-wrap" aria-hidden="true" style={{ y: yVideo }}>
        <video
          className="hero-video"
          src="/hen_video.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        <div className="hero-vignette" />
      </motion.div>

      <div className="hero-centre">
        <motion.div
          className="eyebrow-tag eyebrow-tag--light"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          B&apos;LURU FRESH Chicken · Pure Process Pure Protein
        </motion.div>

        <motion.h1
          className="hero-h1"
          variants={containerVars}
          initial="hidden"
          animate="visible"
        >
          <span style={{ display: 'block' }}>
            <motion.span style={{ display: 'inline-block' }} variants={textVars}>Fresh Chicken</motion.span>
          </span>
          <span style={{ display: 'block' }}>
            <motion.span style={{ display: 'inline-block' }} variants={textVars}><em>Raw Chicken,</em></motion.span>
          </span>
          <span style={{ display: 'block' }}>
            <motion.span style={{ display: 'inline-block' }} variants={textVars}>Delivered.</motion.span>
          </span>
        </motion.h1>

        <motion.p
          className="hero-body"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
        >
          Cut fresh, delivered fresh in Bangalore.
          Whole birds, curry cuts, boneless fillets and bulk packs processed under FSSAI-licensed conditions.
        </motion.p>

        <motion.div
          className="hero-actions--centre"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          <a href="#menu" className="btn-primary btn-lg" id="hero-menu-btn" onClick={(e) => handleSmoothScroll(e, '#menu')}>
            <span>Shop Fresh Cuts</span>
            <span className="btn-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17L17 7"/><path d="M7 7h10v10"/>
              </svg>
            </span>
          </a>
          <a href="#story" className="btn-ghost btn-ghost--light" id="hero-story-btn" onClick={(e) => handleSmoothScroll(e, '#story')}>
            Our Story
          </a>
        </motion.div>

        <motion.div
          className="hero-stats--centre"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
        >
        
        
          <div className="stat stat--light">
            <span className="stat-num">100%</span>
            <span className="stat-label">Antibiotic controlled</span>
          </div>
        </motion.div>
      </div>

      <div className="marquee-wrap" aria-hidden="true">
        <div className="marquee-track">
          {['Fresh Cuts', 'Antibiotic Controlled', 'FSSAI Licensed', 'Same-Day Fresh', 'No Added Preservatives', 'Yelahanka'].flatMap(item => [
            <span key={item}>{item}</span>,
            <span className="dot" key={`${item}-dot`}>·</span>,
          ])}
          {['Fresh Cuts', 'Antibiotic Controlled', 'FSSAI Licensed', 'Same-Day Fresh', 'No Added Preservatives', 'Yelahanka'].flatMap(item => [
            <span key={`${item}-2`}>{item}</span>,
            <span className="dot" key={`${item}-dot-2`}>·</span>,
          ])}
        </div>
      </div>
    </section>
  )
}
