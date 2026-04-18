export const preloadImages = async (imagePaths: string[]): Promise<void> => {
  const promises = imagePaths.map(path => 
    new Promise<void>((resolve) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = () => resolve() // Resolve even on error to not block game start
      img.src = path
    })
  )
  
  return Promise.all(promises).then(() => {})
}

export const spaceBarInvadersAssets = [
  '/icons/space-stars-background.jpg',
  '/icons/planet-earth.png',
  '/icons/exploding-earth.jpg',
  '/icons/collision.svg',
  '/icons/asteroid.svg',
  '/icons/asteroid-2.svg',
  '/icons/asteroid-3.svg',
  '/icons/asteroid-4.svg',
  '/icons/satellite.svg',
  '/icons/satellite-2.svg',
  '/icons/satellite-3.svg',
  '/icons/satellite-4.svg',
  '/icons/ufo-1.svg',
  '/icons/ufo-2.svg',
]
