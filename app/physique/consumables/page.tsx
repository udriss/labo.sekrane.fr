"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function PhysiqueConsumablesPage() {
  const router = useRouter()

  useEffect(() => {
    // Rediriger vers la page physique principale avec l'onglet consumables
    router.replace('/physique?tab=consumables')
  }, [router])

  return null
}
