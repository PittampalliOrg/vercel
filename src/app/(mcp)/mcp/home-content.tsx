"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "react-toastify"
import InspectorApp from "../components/InspectorApp"

export default function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Handle URL params (e.g. after OAuth callback)
    const serverUrl = searchParams.get("serverUrl")
    if (serverUrl) {
      // Store serverUrl in localStorage
      localStorage.setItem("lastSseUrl", serverUrl)
      localStorage.setItem("lastTransportType", "sse")

      // Create a new URL without the serverUrl parameter
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete("serverUrl")

      // Update browser history without reloading the page
      window.history.replaceState({}, "", newUrl.toString())

      // Show success toast for OAuth
      toast.success("Successfully authenticated with OAuth")
    }
  }, [searchParams, router])

  return <InspectorApp />
}

