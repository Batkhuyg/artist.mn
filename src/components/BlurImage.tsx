import { useState } from 'react'
import { thumbUrl } from '../data/catalog.ts'

interface Props {
  src: string
  alt?: string
  className?: string // sizing/rounding for the wrapper
  imgClassName?: string
  fit?: 'cover' | 'contain' // main image fit; thumb always fills (blurred bg)
}

// Progressive image: shows a blurred thumbnail filling the frame, then fades the
// full image in once it loads — so the slot is never blank.
export default function BlurImage({ src, alt = '', className = '', imgClassName = '', fit = 'cover' }: Props) {
  const [loaded, setLoaded] = useState(false)
  const thumb = thumbUrl(src)

  return (
    <div className={`relative overflow-hidden bg-surface ${className}`}>
      {thumb && (
        <img
          src={thumb}
          alt=""
          aria-hidden
          className={`absolute inset-0 h-full w-full scale-110 object-cover blur-xl ${loaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}
        />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`relative h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover'} transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
      />
    </div>
  )
}
