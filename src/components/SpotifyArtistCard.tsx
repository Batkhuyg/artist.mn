import { type Artist } from '../data/catalog.ts'
import BlurImage from './BlurImage.tsx'

export default function SpotifyArtistCard({ a }: { a: Artist }) {
  const avatar = a.albums[0]?.cover_image
  return (
    <a
      href={a.spotify_url}
      target="_blank"
      rel="noreferrer"
      className="flex w-28 shrink-0 flex-col items-center gap-3 text-center"
    >
      <BlurImage
        src={avatar ?? ''}
        alt={a.name}
        fit="contain"
        className="h-24 w-24 rounded-[var(--radius-pill)] ring-2 ring-line transition hover:ring-accent"
      />
      <div>
        <p className="text-[14px] font-medium leading-tight">{a.name}</p>
        <p className="text-[12px] text-ink-soft">{a.album_count} цомог</p>
      </div>
    </a>
  )
}
