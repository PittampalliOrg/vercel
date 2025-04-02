"use client"

import { Suspense } from "react"
import { Providers } from "../components/providers"
import HomeContent from "./home-content"

export default function Home() {
  return (
    <Providers>
      <Suspense fallback={<div>Loading...</div>}>
        <HomeContent />
      </Suspense>
    </Providers>
  )
}

