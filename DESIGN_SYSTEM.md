# Philosophy Customer App — Design System

> Status: **v0 baseline + recommendations**. Documents what exists today and the gaps to close. Generated from a review of `lib/style`, `lib/ui/widgets`, and inline usage across 239 Dart files.

---

## 1. Snapshot — what the review found

| Area | State | Evidence |
|------|-------|----------|
| Color tokens | Exist (`MyColors`) but bypassed often | 748 `MyColors.*` uses **but** 436 raw `Colors.white`, 130 `Colors.black`, 48 hardcoded `Color(0x…)` |
| Text styles | Only sizes tokenized (`MyTextSize`), no full styles | 554 inline `TextStyle(…)`, font family + weight repeated by hand each time |
| Global theme | **Missing** | `GetMaterialApp` has no `theme:` — every screen restyles from scratch |
| Radius | No scale | 427 `circular()` calls; `12` used 87×, but pill = `10000`/`1000`/`100`/`48` inconsistently |
| Spacing | Implicit 4/8/12/16/24/32 but unenforced | 533 `EdgeInsets`; common = 16(194×), 12(143×), 24(65×), 8(45×) |
| Components | Partial library in `lib/ui/widgets` | `my_button`, `input`, `watch_button`, `appbar`, `badge`, etc. — not centrally documented |

**Headline problems**
1. No `ThemeData` → no single source of truth; dark theme re-implemented inline per screen.
2. Raw `Colors.white`/`Colors.black` defeat the token system (566 escapes).
3. `TextStyle` copy-pasted 554× — font family + weight set together every time (redundant + drift-prone).
4. Radius has no scale; "pill" expressed 4 different magic numbers.

---

## 2. Foundations (tokens)

### 2.1 Color

App is **dark-first**. Current palette in [`lib/style/my_colors.dart`](lib/style/my_colors.dart):

**Brand / neutrals (as defined today)**
| Token | Hex | Role today |
|-------|-----|------------|
| `B900_black` | `#1E252F` | near-black surface |
| `B800_background` | `#141414` | app background |
| `B700_coregray` | `#232323` | cards / core gray |
| `B750` | `#353535` | elevated gray |
| `B600` | `#121926` | — |
| `B500` | `#202939` | — |
| `B400` | `#364152` | — |
| `G950…G500` | `#5D5D5D → #E3E8EF` | gray ramp (text/borders) |
| `W900…W600` | `#FFFFFF → #EFEFEF` | white ramp |
| `R900` | `#E21204` | danger / accent red |
| `primaryBlue` | `#2196F3` | primary action |
| `grey2` | `#879DAB` | secondary text |

**Problem:** names mix scale + semantic (`B900_black`, `B800_background`). Hard to know which to use.

**Recommended semantic layer** (add on top, keep raw ramp as private):
```
surface.background   → B800_background  (#141414)
surface.card         → B700_coregray    (#232323)
surface.elevated     → B750             (#353535)
text.primary         → W900             (#FFFFFF)
text.secondary       → G700             (#9AA4B2)
text.muted           → grey2            (#879DAB)
border.subtle        → B750             (#353535)
action.primary       → primaryBlue      (#2196F3)
action.onPrimary     → W900
feedback.danger      → R900             (#E21204)
```
Rule: screens reference **semantic** tokens, never raw ramp or `Colors.white`.

### 2.2 Typography

Font: **TT Norms Pro** (Regular / Medium / Bold) — [`constants.dart`](lib/utils/constants.dart). Sizes in [`my_text.dart`](lib/style/my_text.dart).

**Problem:** `MyTextSize` only holds numbers. Every call site re-declares `fontFamily` + `fontSize` + `fontWeight`. Bold weight already baked into the bold font file, so setting both is redundant.

**Recommended type scale** (full `TextStyle` tokens, family implies weight):
| Token | Font | Size | Use |
|-------|------|------|-----|
| `displayL` | Bold | 48 | hero |
| `titleL` | Bold | 24 | screen title |
| `titleM` | Bold | 18 | section / button |
| `bodyL` | Regular | 16 | body |
| `bodyM` | Regular | 14 | default body |
| `bodyS` | Regular | 12 | meta / caption |
| `labelM` | Medium | 14 | labels / tabs |

Expose as `AppText.titleM` returning a ready `TextStyle`. Override only color at call site.

### 2.3 Spacing scale

Standardize on **4-based**: `4, 8, 12, 16, 24, 32, 48`. (Matches the observed clusters.) Add `AppSpacing` constants; ban arbitrary values like `5`, `14`, `132`.

### 2.4 Radius scale

Define and enforce:
| Token | Value | Use |
|-------|-------|-----|
| `radius.sm` | 8 | chips, small cards |
| `radius.md` | 12 | cards (most common today) |
| `radius.lg` | 24 | sheets, large cards |
| `radius.pill` | 999 | fully rounded buttons |

Replace the zoo of `10000 / 1000 / 100 / 48 / 70 / 92` with these. `BRadius12` in `constants.dart` already hints at this direction — promote it.

### 2.5 Elevation / glass

Dark theme uses blur/glass widgets (`glass.dart`, `glass_btn.dart`). Document blur sigma + overlay opacity as tokens so they don't drift.

---

## 3. Components (existing in `lib/ui/widgets`)

| Component | File | Notes |
|-----------|------|-------|
| Button | `component/my_button.dart` | primary action |
| Watch button | `watch_button.dart` | white pill, "Үзэх" |
| Input | `component/input.dart`, `global_number_input.dart` | forms |
| App bar | `appbar.dart` | screen header |
| Badge | `badge.dart` | counts/labels |
| Glass / Glass btn | `glass.dart`, `glass_btn.dart` | blurred surfaces |
| Follow btn | `follow_btn.dart` | social |
| Search btn | `search_btn.dart` | — |
| Movie card | `movie_card.dart` | content tile |
| Tab item | `tab/tab_item.dart` | nav |
| Empty state | `empty/empty.dart` | zero-data |
| Loading | `loading_indicator.dart` | async |
| Icon background | `icon_background.dart` | — |
| Life progress | `life_progress.dart` | — |
| Date separator | `date_separator.dart` | lists |

**Gap:** no single index/preview. Each is fine in isolation but styled with inline values, so they drift from one another.

---

## 4. UX review notes

- **Consistency risk** is the main UX issue: with no theme, the same element (e.g. a card) can have radius 12 on one screen and 16 on another, white text `#FFFFFF` vs `W800 #FCFCFD` elsewhere. Users perceive this as polish loss.
- **Touch targets:** verify buttons hit ≥48×48 logical px (watch_button vertical padding 12 + text → ~44, borderline). Audit small icon buttons.
- **Empty/loading/error states:** `empty.dart` + `loading_indicator.dart` exist — confirm every async screen wires all three (not just loading).
- **Accessibility:** dark theme + `grey2 #879DAB` on `#141414` ≈ contrast 4.0:1 — **below WCAG AA 4.5:1 for body text**. Use `G700`/`G600` for small text on dark.
- **Localization:** UI strings are Mongolian inline (e.g. `'Үзэх'`). Fine, but centralize for consistency + future i18n.

---

## 5. Migration plan (incremental, low-risk)

1. **Add `ThemeData`** to `GetMaterialApp` — set `scaffoldBackgroundColor`, `fontFamily`, `textTheme`, `colorScheme` from tokens. Immediate win, no screen rewrites needed.
2. **Add semantic color layer** (`AppColors`) wrapping `MyColors`. New code uses it.
3. **Add `AppText` style tokens** + `AppSpacing` + `AppRadius`.
4. **Lint/grep gate:** fail review on new `Colors.white`, `Colors.black`, raw `Color(0x…)`, magic `circular()` outside the scale.
5. **Burn down** the 566 raw-color + 554 inline-TextStyle escapes screen-by-screen, highest-traffic first (`home`, `movie`, `player`).

---

## 6. Token reference (proposed `lib/style` additions)

```dart
// app_radius.dart
class AppRadius {
  static const double sm = 8, md = 12, lg = 24, pill = 999;
}

// app_spacing.dart
class AppSpacing {
  static const double xs = 4, sm = 8, md = 12, lg = 16, xl = 24, xxl = 32, xxxl = 48;
}

// app_text.dart  (family implies weight)
class AppText {
  static const titleL = TextStyle(fontFamily: fontTT_Bold,    fontSize: 24);
  static const titleM = TextStyle(fontFamily: fontTT_Bold,    fontSize: 18);
  static const bodyM  = TextStyle(fontFamily: fontTT_Regular, fontSize: 14);
  static const labelM = TextStyle(fontFamily: fontTT_Medium,  fontSize: 14);
  // …
}
```

---

*Maintained alongside `lib/style`. Update this file when tokens or shared components change.*
