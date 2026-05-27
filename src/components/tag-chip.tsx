'use client'

import { useRouter } from 'next/navigation'

interface Props {
  name: string
}

export default function TagChip({ name }: Props) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => router.push(`/?tag=${encodeURIComponent(name)}`)}
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-normal bg-zinc-100 text-zinc-600 cursor-pointer hover:bg-zinc-200 hover:text-zinc-900"
    >
      {name}
    </button>
  )
}
