'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function Logo({ 
  size = 'medium', 
  showText = true, 
  clickable = true, 
  className = '' 
}) {
  const sizeClasses = {
    small: 'h-8 w-8',
    medium: 'h-10 w-10', 
    large: 'h-16 w-16',
    xlarge: 'h-24 w-24'
  }

  const textSizes = {
    small: 'text-sm',
    medium: 'text-lg',
    large: 'text-xl',
    xlarge: 'text-2xl'
  }

  const logoElement = (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className="relative">
        <img 
          src="/image.png" 
          alt="PredictAgri Logo" 
          className={`${sizeClasses[size]} rounded-lg shadow-lg border-2 border-green-400 object-cover`}
        />
        {size === 'large' || size === 'xlarge' ? (
          <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
            AI
          </div>
        ) : null}
      </div>
      {showText && (
        <span className={`font-bold text-green-400 ${textSizes[size]}`}>
          PredictAgri
        </span>
      )}
    </div>
  )

  if (clickable) {
    return (
      <Link href="/" className="hover:opacity-80 transition-opacity">
        {logoElement}
      </Link>
    )
  }

  return logoElement
}

// Variant components for different use cases
export function HeroLogo() {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-6">
        <div className="relative">
          <img 
            src="/image.png" 
            alt="PredictAgri Logo" 
            className="h-24 w-24 rounded-2xl shadow-2xl border-4 border-green-400 transform hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
            AI
          </div>
        </div>
      </div>
      <h1 className="text-5xl font-bold text-green-400 mb-4">
        PredictAgri
      </h1>
      <p className="text-xl text-gray-300 mb-6 max-w-3xl mx-auto">
        Advanced AI/ML Solution for Precision Agriculture and Crop Yield Prediction
      </p>
    </div>
  )
}

export function FeatureBadges() {
  return (
    <div className="flex justify-center space-x-4 mb-8">
      <div className="bg-green-900/50 border border-green-500 rounded-lg px-4 py-2">
        <span className="text-green-400 font-semibold">🌾 Crop Analytics</span>
      </div>
      <div className="bg-blue-900/50 border border-blue-500 rounded-lg px-4 py-2">
        <span className="text-blue-400 font-semibold">🛰️ Satellite Data</span>
      </div>
      <div className="bg-purple-900/50 border border-purple-500 rounded-lg px-4 py-2">
        <span className="text-purple-400 font-semibold">🤖 AI Predictions</span>
      </div>
    </div>
  )
}
