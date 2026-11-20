# MarketBrief

MarketBrief turns public prediction-market questions into evidence-backed research bounties. Gemini supplies the event and settlement context; Solana Devnet holds the task reward in a program-controlled escrow; a human creator reviews the report before approving a payout.

This is not a prediction-market trading client. It does not place Gemini orders, manage positions, or move Gemini market exposure onto Solana.

## The problem

Prediction-market prices are easy to read and settlement rules are easy to skip. MarketBrief makes “understand this event before it resolves” a concrete task with acceptance criteria, source links, version hashes, and an auditable payment trail.

## System roles

- Gemini public prediction-market events: title, instrument symbol, outcomes, prices, status, close time, and settlement information.
- Solana Devnet: escrow PDA state and native SOL reward transitions.
- Phantom: creator and worker wallet signatures. Private keys never enter this repository.
- D1: bounty drafts, market snapshots, submissions, reviews, and confirmed transaction signatures.

The UI labels all funds as Devnet demo funds with no real monetary value. The current program uses native Devnet SOL; a future version can replace the reward instruction with an audited USDC SPL escrow.

## Escrow state machine

`Draft → Funded → Submitted → Approved → Released`

`Funded → Refunded` is the refund path. The native program owns these transitions and rejects duplicate funding, release, or refund, missing submissions, wrong creator signatures, and a worker other than the submitted worker.

The program ID used by the source is `6wWCsbhqS16ZU3JsKUmhwwZ5VdwQD5Rzk6EwPcheHKF4`. The source is in [`programs/escrow/src/lib.rs`](programs/escrow/src/lib.rs). Do not claim a payout until the wallet transaction is confirmed and its signature is stored in D1.

## Local setup

Requirements: Node.js 20+, pnpm, Rust, Solana CLI, and a Phantom wallet configured for Devnet.

```sh
pnpm install
cp .env.example .env
pnpm exec wrangler d1 migrations apply market-brief --local
pnpm dev
```

The browser market endpoint uses Gemini’s public endpoint and needs no Gemini API key. The production Worker uses the native `DB` D1 binding configured in `wrangler.jsonc`; the app does not use a separate D1 REST token. `CLOUDFLARE_API_TOKEN` is used by Wrangler for deployment and must not be exposed to the browser.

For deployment, the Cloudflare API token must include the account-level `Workers Scripts: Edit` permission (this covers Worker and static asset upload) and `D1: Edit` for remote migrations. `Account Settings: Read` is useful for Wrangler diagnostics but is not used by the application.

## Solana setup

```sh
solana config set --url devnet
solana address
solana balance
solana airdrop 2
```

The native escrow binary can be built with:

```sh
NO_DNA=1 cargo build-sbf --manifest-path programs/escrow/Cargo.toml
```

The program keypair is intentionally kept outside the repository. After explicit review of the Devnet transaction, deploy the resulting `.so` with the external keypair:

```sh
NO_DNA=1 solana program deploy programs/escrow/target/deploy/marketbrief_escrow.so \
  --program-id /Users/veritas/.config/solana/marketbrief_escrow-keypair.json \
  --url devnet
```

The public ID must remain `6wWCsbhqS16ZU3JsKUmhwwZ5VdwQD5Rzk6EwPcheHKF4`; verify it with `solana program show` before connecting the UI.

## Demo path

1. Open `/learn` to explain probability, settlement terms, and the available → escrowed → released/refunded teaching loop.
2. Browse `/markets`; data comes from the server-side Gemini REST endpoint.
3. Open a market and create a draft bounty.
4. Connect Phantom on Devnet. The draft is stored in D1 and remains editable before funding.
5. On the bounty page, click **Fund escrow from Phantom**. The browser confirms both PDA initialization and funding before recording the signature.
6. Connect a worker wallet, submit Markdown and one source URL per line. The server stores a SHA-256 manifest hash and increments the submission version.
7. Reconnect as the creator, review the report, then approve and release or refund. The program transaction must confirm before D1 changes to `RELEASED` or `REFUNDED`.
8. Use the stored signature with the Devnet Explorer link for the final evidence trail.

## Verification commands

```sh
pnpm test
pnpm build
pnpm exec wrangler deploy --dry-run
```

`pnpm check`, `pnpm build`, and the unit suite are green. The check command deliberately type-checks the authored TypeScript source and Svelte files while excluding generated SvelteKit output.

## Known limits

- The first demo supports Markdown and source URLs, not file uploads.
- D1 records are an application index; the Solana PDA and confirmed signatures are the source of truth for funds.
- AI advisory review is intentionally not a release authority. No automatic agent can sign or move funds.
- Native SOL is used only on Devnet. There is no real monetary value and no mainnet deployment path in this MVP.
