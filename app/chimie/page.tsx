"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ChimiePage() {
  const router = useRouter()

  useEffect(() => {
    // Rediriger vers la page principale de chimie (chemicals)
    router.replace('/chimie/chemicals')
  }, [router])

  return null
}
