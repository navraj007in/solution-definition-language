import { Hero } from '@/components/sections/Hero'
import { HowItWorks } from '@/components/sections/HowItWorks'
import { Generators } from '@/components/sections/Generators'
import { Stacks } from '@/components/sections/Stacks'
import { CTA } from '@/components/sections/CTA'

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Generators />
      <Stacks />
      <CTA />
    </>
  )
}
