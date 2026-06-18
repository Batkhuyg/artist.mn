export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 text-[13px] text-ink-soft md:flex-row md:items-center md:justify-between md:px-6">
        <span>© {new Date().getFullYear()} ARTIST.MN</span>
        <span className="text-ink-muted">🍊 NEW ORANGE TECH LLC</span>
      </div>
    </footer>
  )
}
