'use client'

import Navigation from '../components/Navigation'
import Logo, { HeroLogo, FeatureBadges } from '../components/Logo'

export default function LogoTestPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      
      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-green-400 mb-8 text-center">
            🎨 Logo Component Showcase
          </h1>
          
          <div className="space-y-12">
            {/* Hero Logo */}
            <div className="bg-gray-900 rounded-lg p-8 border border-gray-700">
              <h2 className="text-2xl font-semibold text-white mb-6">Hero Logo</h2>
              <HeroLogo />
            </div>
            
            {/* Feature Badges */}
            <div className="bg-gray-900 rounded-lg p-8 border border-gray-700">
              <h2 className="text-2xl font-semibold text-white mb-6">Feature Badges</h2>
              <FeatureBadges />
            </div>
            
            {/* Logo Variants */}
            <div className="bg-gray-900 rounded-lg p-8 border border-gray-700">
              <h2 className="text-2xl font-semibold text-white mb-6">Logo Variants</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">Small Logo</h3>
                    <Logo size="small" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">Medium Logo</h3>
                    <Logo size="medium" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">Large Logo</h3>
                    <Logo size="large" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">Extra Large Logo</h3>
                    <Logo size="xlarge" />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">Logo without Text</h3>
                    <Logo size="medium" showText={false} />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">Non-clickable Logo</h3>
                    <Logo size="medium" clickable={false} />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">Custom Styling</h3>
                    <Logo size="medium" className="bg-gray-800 p-4 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Logo Information */}
            <div className="bg-gray-900 rounded-lg p-8 border border-gray-700">
              <h2 className="text-2xl font-semibold text-white mb-6">Logo Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-300">
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">File Details</h3>
                  <ul className="space-y-2">
                    <li><strong>File:</strong> /public/image.png</li>
                    <li><strong>Size:</strong> 182KB</li>
                    <li><strong>Format:</strong> PNG</li>
                    <li><strong>Usage:</strong> Primary logo and favicon</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">Component Features</h3>
                  <ul className="space-y-2">
                    <li>✅ Multiple size variants</li>
                    <li>✅ Optional text display</li>
                    <li>✅ Clickable/non-clickable</li>
                    <li>✅ Custom styling support</li>
                    <li>✅ AI badge for large sizes</li>
                    <li>✅ Responsive design</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
