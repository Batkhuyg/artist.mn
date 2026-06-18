// Catalog types + pure helpers. All data is loaded from Supabase (see store/catalog.tsx).

export type ProductKind = 'album' | 'merch'

export type SizeStock = Record<string, number>

export interface Product {
  id: string
  kind: ProductKind
  title: string
  artist: string
  artist_id: string
  price: number // MNT
  cover: string // gradient css or image url
  tag?: string
  desc: string
  sizes?: string[] // plain size labels (qty lives in SizeStock)
}

export interface Track {
  track_number: number
  disc_number: number
  title: string
  artists: { name: string; uri: string }[]
  duration_ms: number
  duration: string
  playcount: string
  uri: string
  spotify_url: string
  playable: boolean
}

export interface Album {
  artist: { name: string; id: string; uri: string; spotify_url: string }
  album_id: string
  uri: string
  spotify_url: string
  title: string
  type: string
  release_date: string
  release_year: number
  cover_image: string
  total_tracks: number
  tracks?: Track[]
  sort_order: number
}

export interface Artist {
  id: string
  name: string
  uri: string
  spotify_url: string
  album_count: number
  track_count: number
  albums: Album[]
}

export const formatMNT = (n: number) =>
  new Intl.NumberFormat('mn-MN').format(n) + '₮'

// True when a cover value is an image url (vs a css gradient placeholder).
export const isImageUrl = (s?: string): boolean => !!s && /^https?:\/\//.test(s)

// Derive the tiny blur-up thumbnail url for images we uploaded to DO Spaces (artist.mn/* keys).
// Main is `<base>.jpg`, thumb is `<base>_thumb.jpg`. Returns undefined for external urls.
export function thumbUrl(url?: string): string | undefined {
  if (!url || !/\/artist\.mn\/.+\.jpg(\?.*)?$/.test(url)) return undefined
  return url.replace(/\.jpg(\?.*)?$/, '_thumb.jpg')
}

// Deterministic price from album: base + per-track + small recency premium.
export function albumPrice(a: Album): number {
  const base = 9900
  const perTrack = 1200
  const recency = Math.max(0, a.release_year - 2005) * 300
  const raw = base + a.total_tracks * perTrack + recency
  return Math.round(raw / 1000) * 1000 - 100
}

// products.sizes encodes per-size qty as "S:10". Parse into { size: qty }.
export function parseSizeStock(sizes: unknown): SizeStock | null {
  if (!Array.isArray(sizes)) return null
  const map: SizeStock = {}
  for (const entry of sizes) {
    const [size, qtyRaw] = String(entry).split(':')
    const qty = Number(qtyRaw)
    if (size && qtyRaw !== undefined && Number.isFinite(qty)) map[size.trim()] = qty
  }
  return Object.keys(map).length ? map : null
}

// Plain size labels from a possibly-encoded sizes array (["S:10"] -> ["S"]).
export function sizeLabels(sizes: unknown): string[] | undefined {
  if (!Array.isArray(sizes) || sizes.length === 0) return undefined
  return sizes.map((s) => String(s).split(':')[0].trim()).filter(Boolean)
}

type Row = Record<string, unknown>

export function rowToProduct(row: Row): Product {
  return {
    id: String(row.id),
    kind: (row.kind as ProductKind) ?? 'merch',
    title: String(row.title ?? ''),
    artist: String(row.artist ?? ''),
    artist_id: String(row.artist_id ?? ''),
    price: Number(row.price) || 0,
    cover: String(row.cover ?? ''),
    tag: row.tag ? String(row.tag) : undefined,
    desc: String(row.desc ?? row.description ?? ''),
    sizes: sizeLabels(row.sizes),
  }
}

export function rowToAlbum(row: Row): Album {
  return {
    artist: {
      name: String(row.artist_name ?? ''),
      id: String(row.artist_id ?? ''),
      uri: String(row.artist_uri ?? ''),
      spotify_url: String(row.artist_spotify_url ?? ''),
    },
    album_id: String(row.album_id),
    uri: String(row.uri ?? ''),
    spotify_url: String(row.spotify_url ?? ''),
    title: String(row.title ?? ''),
    type: String(row.type ?? 'ALBUM'),
    release_date: String(row.release_date ?? ''),
    release_year: Number(row.release_year) || 0,
    cover_image: String(row.cover_image ?? ''),
    total_tracks: Number(row.total_tracks) || 0,
    tracks: Array.isArray(row.tracks) ? (row.tracks as Track[]) : [],
    sort_order: Number(row.sort_order) || 0,
  }
}

// Group albums into artists (used for the home page sections).
export function groupArtists(albums: Album[]): Artist[] {
  const map = new Map<string, Artist>()
  for (const a of albums) {
    const info = a.artist
    if (!info.id) continue
    let artist = map.get(info.id)
    if (!artist) {
      artist = {
        id: info.id,
        name: info.name,
        uri: info.uri,
        spotify_url: info.spotify_url,
        album_count: 0,
        track_count: 0,
        albums: [],
      }
      map.set(info.id, artist)
    }
    artist.albums.push(a)
    artist.album_count += 1
    artist.track_count += a.total_tracks
  }
  return [...map.values()]
}
