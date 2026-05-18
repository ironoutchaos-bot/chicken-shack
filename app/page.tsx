import Nav from '@/components/Nav'
import PageLoader from '@/components/PageLoader'
import HeroScroll from '@/components/HeroScroll'
import Story from '@/components/Story'
import Trust from '@/components/Trust'
import Wholesale from '@/components/Wholesale'
import OrderCTA from '@/components/OrderCTA'
import Footer from '@/components/Footer'
import StickyOrderBtn from '@/components/StickyOrderBtn'

export default function Home() {
  return (
    <>
      <PageLoader />
      {/* Fixed noise texture overlay */}
      <div className="noise-overlay" aria-hidden="true" />

      <Nav />
      <main>
        <HeroScroll />
        <StickyOrderBtn />
        <Story />
        <Trust />
        <Wholesale />
        <OrderCTA />
      </main>
      <Footer />
    </>
  )
}
