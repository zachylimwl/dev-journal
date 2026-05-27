'use client'

import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

interface Props {
  tag: string
  currentQ?: string
}

export default function ActiveFilterChip({ tag, currentQ }: Props) {
  const router = useRouter()

  function handleClear() {
    const params = new URLSearchParams()
    if (currentQ) params.set('q', currentQ)
    const qs = params.toString()
    router.push(qs ? `/?${qs}` : '/')
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 mt-2">
      <span className="text-xs font-normal text-zinc-600">Active filter: {tag}</span>
      <button
        type="button"
        aria-label="Clear tag filter"
        onClick={handleClear}
        className="p-1 text-zinc-400 hover:text-zinc-700"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
