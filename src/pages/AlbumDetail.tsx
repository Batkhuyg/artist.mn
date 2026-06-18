import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { albumPrice, formatMNT, type Album } from '../data/catalog.ts'
import { useBasket } from '../store/basket.tsx'
import { useCatalog } from '../store/catalog.tsx'
import Button from '../components/Button.tsx'
import BlurImage from '../components/BlurImage.tsx'

// Upsert a <meta> tag by name or property.
function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function albumDescription(a: Album) {
  return `${a.artist.name} · ${a.release_year} · ${a.total_tracks} дуу · ${formatMNT(albumPrice(a))}`
}

export default function AlbumDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { add } = useBasket()
  const { findAlbum, capacityOf, ready } = useCatalog()
  const album = findAlbum(id)
  const stock = album ? capacityOf(album.album_id) : null
  const soldOut = stock === 0
  const [copied, setCopied] = useState(false)
  const [stockMsg, setStockMsg] = useState<string | null>(null)

  const onAdd = async (albumId: string) => {
    const res = await add(albumId)
    setStockMsg(
      res.ok ? null : res.available === 0 ? 'Дууссан.' : `Үлдэгдэл хүрэлцэхгүй (${res.available} ширхэг).`,
    )
  }

  // Update document title + OG/Twitter tags from album data.
  useEffect(() => {
    if (!album) return
    const url = window.location.href
    const desc = albumDescription(album)
    const prevTitle = document.title
    document.title = `${album.title} — ${album.artist.name} · ARTIST.MN`
    setMeta('property', 'og:type', 'music.album')
    setMeta('property', 'og:title', album.title)
    setMeta('property', 'og:description', desc)
    setMeta('property', 'og:image', album.cover_image)
    setMeta('property', 'og:url', url)
    setMeta('name', 'description', desc)
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', album.title)
    setMeta('name', 'twitter:description', desc)
    setMeta('name', 'twitter:image', album.cover_image)
    return () => {
      document.title = prevTitle
    }
  }, [album])

  const onShare = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard blocked — fallback prompt
      window.prompt('Холбоосыг хуулна уу:', url)
    }
  }

  if (!album) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-[24px] font-bold">{ready ? 'Альбом олдсонгүй' : 'Уншиж байна...'}</h1>
        {ready && <Link to="/" className="mt-6 inline-block"><Button>Нүүр рүү</Button></Link>}
      </div>
    )
  }

  const tracks = album.tracks ?? []

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex w-fit items-center gap-1 text-[14px] text-ink-soft hover:text-ink"
        >
          ← Буцах
        </button>

        <button
          onClick={onShare}
          className="flex items-center gap-2 rounded-[var(--radius-pill)] bg-surface px-3 py-2 text-[13px] text-ink-soft transition hover:bg-elevated hover:text-ink"
          aria-label="Хуваалцах"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          {copied ? 'Линк хуулагдлаа ✓' : 'Линк хуулах'}
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-[260px_1fr] md:gap-8">
        <div className="mx-auto h-fit w-full max-w-[280px] md:mx-0 md:max-w-none">
          <BlurImage src={album.cover_image} alt={album.title} className="aspect-square w-full rounded-[var(--radius-lg)]" />
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-[12px] uppercase tracking-[0.2em] text-ink-soft sm:text-[13px]">{album.type}</p>
          <h1 className="text-[24px] font-bold leading-tight sm:text-[32px]">{album.title}</h1>
          <p className="text-[15px] text-ink-soft">
            {album.artist.name} · {album.release_year} · {album.total_tracks} дуу
          </p>
          <p className="mt-2 text-[24px] font-bold">{formatMNT(albumPrice(album))}</p>
          {stock !== null && stock > 0 && (
            <p className="text-[13px] text-ink-soft">Үлдэгдэл: {stock}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-3">
            <Button onClick={() => onAdd(album.album_id)} disabled={soldOut}>
              {soldOut ? 'Дууссан' : 'Сагсанд нэмэх'}
            </Button>
          </div>
          {stockMsg && <p className="text-[13px] text-red-400">{stockMsg}</p>}
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-[18px] font-bold">Дуунууд</h2>
        <ul className="flex flex-col divide-y divide-line rounded-[var(--radius-md)] bg-surface">
          {tracks.map((t) => (
            <li key={t.uri} className="flex items-center gap-4 px-4 py-3">
              <span className="w-6 shrink-0 text-right text-[13px] text-ink-soft">{t.track_number}</span>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-[14px] font-medium">{t.title}</p>
                <p className="truncate text-[12px] text-ink-soft">
                  {t.artists.map((ar) => ar.name).join(', ')}
                </p>
              </div>
              <span className="shrink-0 text-[13px] text-ink-soft">{t.duration}</span>
            </li>
          ))}
          {tracks.length === 0 && (
            <li className="px-4 py-6 text-center text-[13px] text-ink-soft">Дууны мэдээлэл алга.</li>
          )}
        </ul>
      </section>
    </div>
  )
}
