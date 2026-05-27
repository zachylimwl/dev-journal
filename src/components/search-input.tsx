'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useRef } from 'react'
import { Search } from 'lucide-react'

interface Props {
  defaultValue?: string
}

export default function SearchInput({ defaultValue = '' }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString())
        const val = e.target.value.trim()
        if (val) {
          params.set('q', val)
        } else {
          params.delete('q')
        }
        router.replace(`/?${params.toString()}`)
      }, 300)
    },
    [router, searchParams]
  )

  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="search"
        aria-label="Search entries"
        placeholder="Search entries..."
        defaultValue={defaultValue}
        onChange={handleChange}
        className="w-full h-10 pl-9 pr-3 py-2 border border-input rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
      />
    </div>
  )
}
