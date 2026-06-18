import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCatalog } from '../store/catalog.tsx'
import AlbumCard from '../components/AlbumCard.tsx'
import ProductCard from '../components/ProductCard.tsx'
import BlurImage from '../components/BlurImage.tsx'
import Button from '../components/Button.tsx'

export default function ArtistDetail() {
  const { id = '' } = useParams()
  const { findArtist, products, ready } = useCatalog()
  const artist = findArtist(id)
  const merch = products.filter((p) => p.kind === 'merch' && p.artist_id === id)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  if (!artist) {
    return (
      <div className="py-20 text-center">
        <p className="text-ink-soft">{ready ? 'Уран бүтээлч олдсонгүй.' : 'Уншиж байна...'}</p>
        {ready && <Link to="/" className="mt-4 inline-block"><Button variant="ghost">Нүүр</Button></Link>}
      </div>
    )
  }

  const avatar = artist.albums[0]?.cover_image

  return (
    <div className="flex flex-col gap-10 md:gap-16">
      <Link to="/" className="text-[14px] text-ink-soft hover:text-ink">← Буцах</Link>

      <header className="flex items-center gap-5">
        {avatar && (
          <BlurImage
            src={avatar}
            alt={artist.name}
            fit="contain"
            className="h-24 w-24 shrink-0 rounded-[var(--radius-pill)] ring-2 ring-line"
          />
        )}
        <div>
          <h1 className="text-[28px] font-bold leading-tight sm:text-[36px]">{artist.name}</h1>
          <p className="mt-1 text-[14px] text-ink-soft">
            {artist.album_count} цомог{merch.length > 0 ? ` · ${merch.length} бараа` : ''}
          </p>
        </div>
      </header>

      {artist.albums.length > 0 && (
        <section>
          <h2 className="mb-5 text-[22px] font-bold">Альбом</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {artist.albums.map((a, i) => <AlbumCard key={`${a.album_id}-${i}`} a={a} />)}
          </div>
        </section>
      )}

      {merch.length > 0 && (
        <section>
          <h2 className="mb-5 text-[22px] font-bold">Мерчендайз</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {merch.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}
    </div>
  )
}
