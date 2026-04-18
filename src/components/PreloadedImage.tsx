'use client'

import { useState } from 'react'

interface PreloadedImageProps {
  src: string
  alt: string
  className?: string
  style?: React.CSSProperties
  placeholderColor?: string
}

export default function PreloadedImage({
  src,
  alt,
  className,
  style,
  placeholderColor = '#000000'
}: PreloadedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div
      style={{
        backgroundColor: !isLoaded ? placeholderColor : 'transparent',
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
    >
      <img
        src={src}
        alt={alt}
        className={className}
        onLoad={() => setIsLoaded(true)}
        style={{
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in'
        }}
      />
    </div>
  )
}
