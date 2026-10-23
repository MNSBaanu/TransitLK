import Header from '../components/landing/Header'
import Hero from '../components/landing/Hero'
import Features from '../components/landing/Features'
import HowItWorks from '../components/landing/HowItWorks'
import Roles from '../components/landing/Roles'
import CallToAction from '../components/landing/CallToAction'
import Footer from '../components/landing/Footer'

function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-surface text-fleet-ink">
      <Header />
      <Hero />
      <Features />
      <HowItWorks />
      <Roles />
      <CallToAction />
      <Footer />
    </div>
  )
}

export default Landing
