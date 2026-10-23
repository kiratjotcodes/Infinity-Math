# Pocket Change

**Your bills are their pocket change.** Upload a bill, and bored billionaires swipe right to pay it.

Pocket Change is a two-sided, Tinder-style app:

- **People with bills** snap a photo or PDF of a bill, black out anything private, add a short pitch, and watch it live on **My bills** until somebody pays it, with confetti when they do.
- **People with billions** create a tycoon profile, then swipe through a deck of real bills, most urgent first. Right pays, left is "Boring." Every payment shows how long their fortune takes to earn it back (usually about a second), what share of their net worth it was, and what it would feel like to a typical household.
- **The Generosity Index** ranks billionaires by how much pocket change they've given away, next to a live feed of payments.

> Pocket Change is a parody demo. **No real money moves.** A right swipe records a pledge, and billionaires are on the honor system.

## Run it

Requires Node 22.18 or newer, because the server runs TypeScript directly through Node's type stripping.

```bash
cd pocket-change
npm install
npm run dev          # http://localhost:5173 (app and API together)
```

To test both sides of the marketplace, open the app in two windows: upload a bill in one, and swipe right on it in the other. Production build:

```bash
npm run build        # typecheck, then bundle into dist/
npm start            # http://localhost:8787 (serves dist/ plus the API)
npm test             # store, API, house billionaires, formatting, and swipe deck tests
```

| Variable             | Default  | What it does                                        |
| -------------------- | -------- | --------------------------------------------------- |
| `PORT`               | `8787`   | Port for `npm start`.                               |
| `DATA_DIR`           | `./data` | Where `db.json` and uploaded files are kept.        |
| `HOUSE_BILLIONAIRES` | on       | Set to `off` to turn off the simulated billionaires. |

## House billionaires

So the app is fun with only one person using it, seven fictional **house billionaires** (Chad Moneybags III, Baroness von Liquidity and friends) swipe on their own every few seconds. They give humans a 20-second head start on each new bill, look at real people's bills before sample ones, and like small, urgent, well-pitched bills best. They are tagged **House** everywhere they appear. They stop when nobody has used the app for 15 minutes, and they top the deck up with sample bills (tagged **Sample**) whenever it runs low.

## Privacy and safety

- **Redaction before upload.** Photos open in an editor where you drag black boxes over account numbers and addresses. The boxes are burned into a re-encoded JPEG in the browser, so the original never leaves the device. Re-encoding also shrinks large phone photos and strips EXIF metadata such as GPS location. PDFs can't be redacted in the app, and the form says so.
- **Uploads are checked by content.** The server identifies JPEG, PNG, WebP or PDF from the file's first bytes, not its name or declared type, caps uploads at 5 MB, and serves images with `nosniff` and a locked-down CSP. File names are never stored.
- **No accounts, only secret tokens.** Each browser holds a random token that owns its bills, plus one for its billionaire profile once it creates one. The server stores only SHA-256 hashes of them, and never shows submitter tokens or anything beyond a first name to billionaires.

## How it's built

```
shared/types.ts       types and limits shared by client and server
server/store.ts       state, validation and persistence (JSON file, atomic writes)
server/api.ts         /api routes on plain node:http, with no framework
server/house.ts       house-billionaire behaviour and scheduler
server/seed.ts        the first-run world: house billionaires and sample bills
server/main.ts        production server: static files plus the API
vite.config.ts        mounts the same API on the Vite dev and preview servers
src/components/       React UI: SwipeDeck, BillCard, Vault, SubmitBill, Redactor, ...
src/lib/              money maths, dates, hash routing, identity, image redaction
```

The client is React 19 and TypeScript, bundled by Vite. The server has no runtime dependencies.

### API

| Method & path            | Token            | Purpose                                                     |
| ------------------------ | ---------------- | ----------------------------------------------------------- |
| `GET /api/stats`         | none             | Totals, leaderboard and recent payments                     |
| `POST /api/uploads`      | none             | Raw file body, returns an attachment id                     |
| `GET /api/uploads/:id`   | none             | The uploaded file                                           |
| `POST /api/bills`        | bill owner       | Create a bill                                               |
| `GET /api/bills/mine`    | bill owner       | Your bills and their status                                 |
| `DELETE /api/bills/:id`  | bill owner       | Withdraw an unpaid bill                                     |
| `POST /api/billionaires` | none             | Create a billionaire, returns its secret token              |
| `GET /api/billionaires/me` | billionaire    | Your profile and totals                                     |
| `GET /api/deck`          | billionaire      | Unpaid bills you haven't swiped on yet                      |
| `POST /api/swipes`       | billionaire      | `{ billId, direction }`, where the first right swipe pays it |
| `GET /api/portfolio`     | billionaire      | Bills you've paid                                           |

Tokens go in the `x-pocket-token` header.

## Before this handles real money

- **Payments:** `settle()` in `server/store.ts` is the single place a bill becomes paid. A payment provider would plug in there, for example to pay the biller directly so money never passes through the person with the bill.
- **Identity:** billionaires would need verification, and people would need real accounts instead of per-browser tokens.
- **Abuse:** add rate limiting, moderation of pleas and images, and a way to report fake bills.
- **Storage:** the JSON file store is fine for a demo. Swap it for a database before many people use the app at once.
