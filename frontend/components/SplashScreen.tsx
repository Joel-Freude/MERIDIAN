'use client'

import { useEffect, useState } from 'react'

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onComplete(), 500)
    }, 4000)

    return () => clearTimeout(timer)
  }, [onComplete])

  if (!visible) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-cyber-black transition-opacity duration-500 opacity-0 pointer-events-none" />
    )
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-cyber-black">
      <div className="relative flex flex-col items-center gap-6">
        <div className="w-32 h-32 relative">
          <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full animate-ping" style={{ animationDuration: '1.5s' }} />
          <div className="absolute inset-2 border-2 border-cyan-400/50 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-4 border border-cyan-300/70 rounded-full animate-ping" style={{ animationDuration: '2.5s' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_20px_rgba(0,212,255,0.8)] animate-pulse" />
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-wider text-cyan-400 drop-shadow-[0_0_10px_rgba(0,212,255,0.5)] animate-pulse">
            MERIDIAN
          </h1>
          <p className="text-[10px] tracking-widest text-gray-400 mt-2 animate-pulse">
            NETWORK DEVICE INVENTORY MANAGER
          </p>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-8 h-1 bg-cyan-500/80 animate-[bounce_1s_infinite]" style={{ animationDelay: '0s' }} />
          <div className="w-8 h-1 bg-cyan-500/80 animate-[bounce_1s_infinite]" style={{ animationDelay: '0.1s' }} />
          <div className="w-8 h-1 bg-cyan-500/80 animate-[bounce_1s_infinite]" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    </div>
  )
}
