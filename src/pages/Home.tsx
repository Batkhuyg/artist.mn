import { useCatalog } from '../store/catalog.tsx'
import ProductCard from '../components/ProductCard.tsx'
import AlbumCard from '../components/AlbumCard.tsx'
import SpotifyArtistCard from '../components/SpotifyArtistCard.tsx'
import Button from '../components/Button.tsx'

function SectionHead({ id, title, sub }: { id?: string; title: string; sub?: string }) {
  return (
    <div id={id} className="mb-5 scroll-mt-20 flex items-end justify-between">
      <div>
        <h2 className="text-[24px] font-bold tracking-tight">{title}</h2>
        {sub && <p className="text-[14px] text-ink-soft">{sub}</p>}
      </div>
    </div>
  )
}

export default function Home() {
  const { merch, artists } = useCatalog()
  return (
    <div className="flex flex-col gap-10 md:gap-16">
      {/* hero */}
      <section className="relative overflow-hidden rounded-[var(--radius-lg)] p-6 sm:p-8 md:p-14"
        style={{ background: 'linear-gradient(120deg,#1f2937,#141414 55%,#2196f3)' }}>
        <p className="mb-3 text-[12px] uppercase tracking-[0.2em] text-ink-soft sm:text-[13px]">ARTIST.MN</p>
        <h1 className="max-w-2xl text-[28px] font-bold leading-[1.1] sm:text-[40px] md:text-[56px]">
          Уран бүтээлчдийн цомгийг нэг дороос.
        </h1>
        <div className="mt-6 flex flex-wrap gap-3 sm:mt-7">
          <a href="#albums"><Button>Альбом үзэх</Button></a>
          <a href="#merch"><Button variant="ghost">Мерчендайз үзэх</Button></a>
        </div>
      </section>

      {/* albums grouped by artist */}
      <div id="albums" className="flex scroll-mt-20 flex-col gap-10 md:gap-16">
        {artists.map((artist) => (
          <section key={artist.id}>
            <SectionHead
              id={`albums-${artist.id}`}
              title={artist.name}
              sub={`${artist.album_count} цомог`}
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {artist.albums.map((a, i) => (
                <AlbumCard key={`${a.album_id}-${i}`} a={a} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* artists */}
      <section>
        <SectionHead id="artists" title="Уран бүтээлч" sub="Дуучид" />
        <div className="flex gap-5 overflow-x-auto pb-2">
          {artists.map((a) => <SpotifyArtistCard key={a.id} a={a} />)}
        </div>
      </section>

      {/* merch */}
      <section>
        <SectionHead id="merch" title="Мерчендайз" sub="Хувцас, аяга, дэвтэр" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {merch.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* <section className="rounded-[var(--radius-lg)] bg-surface p-8 text-center">
        <h2 className="text-[22px] font-bold">Сагсаа шалгах уу?</h2>
        <p className="mt-1 text-ink-soft">Захиалгаа дуусгаад хүргэлтээ хүлээ.</p>
        <Link to="/basket" className="mt-5 inline-block"><Button>Сагс руу</Button></Link>
      </section> */}
    </div>
  )
}
