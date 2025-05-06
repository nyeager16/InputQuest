'use client'

import { useEffect, useState } from 'react'

export default function Home() {
  const [message, setMessage] = useState<string>('Loading...')

  useEffect(() => {
    fetch('http://localhost:8000/api/hello/')
      .then((res) => res.json())
      .then((data: { message: string }) => setMessage(data.message))
      .catch(() => setMessage('Failed to connect to API'))
  }, [])

  return (
    <main className="flex-1 p-6">
      <h1 className="text-2xl font-bold mb-4">Next.js + Django DRF</h1>
      <p>{message}</p>
    </main>
  )
}
