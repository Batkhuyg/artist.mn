# Philosophy Store — web frontend

E-commerce front UI built on the tokens in [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).
Dark-first. Vite + React + TS + Tailwind v4.

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + prod build
```

## Pages
- `/` — Home: hero, музик альбом, уран бүтээлч, мерчендайз
- `/product/:id` — Product detail, size select, add to basket
- `/basket` — Basket: qty, remove, subtotal + shipping
- `/checkout` — Shipping form, payment method, order confirm

## Design tokens
Ported to CSS vars in [`src/index.css`](src/index.css) (`@theme`):
colors (`bg`/`surface`/`elevated`/`ink`/`accent`/`danger`), radius (`sm/md/lg/pill`), font stack.
Tailwind utilities map to them: `bg-bg`, `text-ink-soft`, `rounded-[var(--radius-md)]`, etc.

## State
Basket = React context + `localStorage` ([`src/store/basket.tsx`](src/store/basket.tsx)). Data mocked in [`src/data/products.ts`](src/data/products.ts); swap for API later.

## Notes
- Font **TT Norms Pro** lives in the Flutter app assets; web uses a system fallback stack. Add `@font-face` with the `.ttf` files to match the app exactly.
- `grey2 #879DAB` reserved for large text only (WCAG AA); body text uses `ink-soft #9AA4B2`.
