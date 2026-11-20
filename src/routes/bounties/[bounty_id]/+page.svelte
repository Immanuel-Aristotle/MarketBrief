<script lang="ts">
	import { page } from '$app/state'
	import { connect_phantom } from '#lib/solana'
	import { get_demo_record, is_demo_mode, save_demo_record } from '#lib/demo'
	import { PublicKey } from '@solana/web3.js'

	type BountyData = { bounty: Record<string, unknown>; submissions: Array<Record<string, unknown>>; reviews: Array<Record<string, unknown>> }
	let record = $state<BountyData | null>(null)
	let loading = $state(true)
	let pending = $state(false)
	let error_message = $state('')
	let summary = $state('')
	let body_markdown = $state('')
	let source_urls = $state('')
	let action_note = $state('')
	let action_message = $state('')
	let chain_pending = $state(false)

	async function escrow_api() {
		return import('#lib/escrow')
	}

	async function load(): Promise<void> {
		loading = true
		const bounty_id = page.params.bounty_id
		if (!bounty_id) throw new Error('Bounty ID is missing')
		if (is_demo_mode()) {
			const demo_record = get_demo_record(bounty_id)
			if (demo_record) { record = demo_record; loading = false; return }
		}
		const response = await fetch(`/api/bounties/${page.params.bounty_id}`)
		const payload: { data?: BountyData; error?: string } = await response.json()
		if (!response.ok || !payload.data) throw new Error(payload.error ?? 'Bounty could not be loaded')
		record = payload.data
		loading = false
	}

	async function submit_report(): Promise<void> {
		pending = true
		error_message = ''
		try {
			if (is_demo_mode() && record) {
				if (!summary.trim() || !body_markdown.trim()) throw new Error('Add a summary and report before submitting')
				record.submissions = [...record.submissions, { version: record.submissions.length + 1, summary, body_markdown, source_urls: source_urls.split('\n').map((value) => value.trim()).filter(Boolean), manifest_hash: 'demo-manifest-hash-no-chain', created_at: new Date().toISOString() }]
				record.bounty.status = 'SUBMITTED'
				save_demo_record(record)
				action_message = 'Demo submission recorded locally. No transaction was signed.'
				summary = ''
				body_markdown = ''
				source_urls = ''
				await load()
				return
			}
			const worker_wallet = (await connect_phantom()).toBase58()
			const response = await fetch(`/api/bounties/${page.params.bounty_id}/submissions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ worker_wallet, summary, body_markdown, source_urls: source_urls.split('\n').map((value) => value.trim()).filter(Boolean) }) })
			const payload: { data?: { manifest_hash: string }; error?: string } = await response.json()
			if (!response.ok || !payload.data) throw new Error(payload.error ?? 'Submission failed')
			action_message = `Version submitted. Manifest hash: ${payload.data.manifest_hash}`
			summary = ''
			body_markdown = ''
			source_urls = ''
			await load()
		} catch (error) {
			error_message = error instanceof Error ? error.message : 'Submission failed'
		} finally {
			pending = false
		}
	}

	async function review(action: 'REVISION' | 'APPROVE' | 'REFUND'): Promise<void> {
		pending = true
		error_message = ''
		try {
			if (is_demo_mode() && record) {
				record.reviews = [...record.reviews, { action, note: action_note || `${action} in demo mode`, reviewer_wallet: 'demo-creator-wallet', created_at: new Date().toISOString() }]
				record.bounty.status = action === 'REVISION' ? 'FUNDED' : action === 'APPROVE' ? 'RELEASED' : 'REFUNDED'
				save_demo_record(record)
				action_message = `${action === 'APPROVE' ? 'Demo reward released' : action === 'REFUND' ? 'Demo refund recorded' : 'Demo revision requested'}. No transaction was signed.`
				action_note = ''
				await load()
				return
			}
			const reviewer_wallet = (await connect_phantom()).toBase58()
			const response = await fetch(`/api/bounties/${page.params.bounty_id}/review`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, reviewer_wallet, note: action_note || `${action} by creator` }) })
			const payload: { data?: { status: string }; error?: string } = await response.json()
			if (!response.ok || !payload.data) throw new Error(payload.error ?? 'Review failed')
			if (action === 'APPROVE' || action === 'REFUND') await complete_chain_review(action, reviewer_wallet)
			action_message = action === 'APPROVE' ? 'Report approved and reward released on Devnet.' : action === 'REFUND' ? 'Reward refunded on Devnet.' : `Revision requested; bounty remains ${payload.data.status}.`
			await load()
		} catch (error) {
			error_message = error instanceof Error ? error.message : 'Review failed'
		} finally {
			pending = false
		}
	}

	async function record_chain_transition(action: 'fund' | 'release' | 'refund', signature: string, wallet: string, escrow_account: string): Promise<void> {
		const response = await fetch(`/api/bounties/${page.params.bounty_id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, signature, wallet, escrow_account }) })
		const payload: { data?: { status: string }; error?: string } = await response.json()
		if (!response.ok || !payload.data) throw new Error(payload.error ?? `Could not record confirmed ${action} transaction`)
	}

	async function fund_escrow(): Promise<void> {
		if (!record) throw new Error('Bounty data is unavailable')
		chain_pending = true
		error_message = ''
		try {
			if (is_demo_mode() && record) {
				record.bounty.status = 'FUNDED'
				record.bounty.escrow_account = 'demo-escrow-no-chain'
				save_demo_record(record)
				action_message = 'Demo escrow funded. No wallet connection or transaction was used.'
				await load()
				return
			}
			const creator_wallet = (await connect_phantom()).toBase58()
			if (creator_wallet !== String(record.bounty.creator_wallet)) throw new Error('Connected wallet does not match the bounty creator')
			const creator = new PublicKey(creator_wallet)
			const escrow = await escrow_api()
			const hash = await escrow.manifest_hash(String(record.bounty.market_snapshot))
			const [escrow_account] = await escrow.derive_escrow_pda(creator, hash)
			const amount = Number(record.bounty.reward_amount_lamports)
			const deadline = Math.floor(new Date(String(record.bounty.deadline)).getTime() / 1000)
			await escrow.sign_and_confirm(escrow.build_init_instruction(creator, escrow_account, hash, amount, deadline))
			const signature = await escrow.sign_and_confirm(escrow.build_fund_instruction(creator, escrow_account, amount))
			await record_chain_transition('fund', signature, creator_wallet, escrow_account.toBase58())
			action_message = 'Escrow funded and confirmed on Devnet.'
			await load()
		} catch (error) {
			error_message = error instanceof Error ? error.message : 'Funding failed'
		} finally {
			chain_pending = false
		}
	}

	async function complete_chain_review(action: 'APPROVE' | 'REFUND', creator_wallet: string): Promise<void> {
		if (!record || !record.bounty.escrow_account) throw new Error('Escrow account is missing; fund the bounty first')
		chain_pending = true
		try {
			const creator = new PublicKey(creator_wallet)
			const escrow = new PublicKey(String(record.bounty.escrow_account))
			const escrow_tools = await escrow_api()
			if (action === 'APPROVE') {
				const worker = new PublicKey(String(record.bounty.worker_wallet ?? ''))
				await escrow_tools.sign_and_confirm(escrow_tools.build_approve_instruction(creator, escrow))
				const signature = await escrow_tools.sign_and_confirm(escrow_tools.build_payout_instruction(creator, worker, escrow, false))
				await record_chain_transition('release', signature, creator_wallet, escrow.toBase58())
			} else {
				const signature = await escrow_tools.sign_and_confirm(escrow_tools.build_payout_instruction(creator, creator, escrow, true))
				await record_chain_transition('refund', signature, creator_wallet, escrow.toBase58())
			}
		} finally {
			chain_pending = false
		}
	}

	$effect(() => { void load().catch((error: unknown) => { error_message = error instanceof Error ? error.message : 'Bounty could not be loaded'; loading = false }) })
</script>

<svelte:head><title>Bounty | MarketBrief</title></svelte:head>

<div class="page-shell content-page detail-page">
	{#if loading}<p class="muted-copy">Loading bounty…</p>{:else if record}
		{@const bounty = record.bounty}
		<section class="page-heading"><p class="eyebrow">Research bounty · {String(bounty.status)}</p><h1>{String(bounty.title)}</h1><p class="lede">{String(bounty.question)}</p></section>
		{#if is_demo_mode()}<div class="demo-note"><strong>Demo simulation</strong><span>All steps below are local-only. No Phantom connection, SOL transfer, or Solana transaction is performed.</span></div>{/if}
		<div class="detail-grid"><section class="detail-card"><h2>Locked requirements</h2><dl><div><dt>Event</dt><dd>{String(bounty.instrument_symbol)}</dd></div><div><dt>Reward</dt><dd>{(Number(bounty.reward_amount_lamports) / 1_000_000_000).toFixed(3)} Devnet SOL</dd></div><div><dt>Deadline</dt><dd>{new Date(String(bounty.deadline)).toLocaleString()}</dd></div><div><dt>Escrow</dt><dd>{bounty.escrow_account ? String(bounty.escrow_account) : 'Not funded'}</dd></div></dl><ul>{#each JSON.parse(String(bounty.acceptance_criteria)) as criterion}<li>{criterion}</li>{/each}</ul>{#if bounty.status === 'DRAFT'}<button class="button button-primary" onclick={() => void fund_escrow()} disabled={chain_pending}>{is_demo_mode() ? 'Simulate funding' : 'Fund escrow from Phantom'}</button>{/if}</section><section class="detail-card"><h2>Review controls</h2><p class="muted-copy">{is_demo_mode() ? 'Try revision, approval, and refund without a wallet.' : 'Human review is required. Each payout waits for confirmed Devnet transactions.'}</p><textarea bind:value={action_note} rows="3" placeholder="Review note"></textarea><div class="button-row"><button class="button" onclick={() => void review('REVISION')} disabled={pending || chain_pending}>Request revision</button><button class="button button-primary" onclick={() => void review('APPROVE')} disabled={pending || chain_pending}>Approve and release</button><button class="button button-danger" onclick={() => void review('REFUND')} disabled={pending || chain_pending}>Refund</button></div></section></div>
		<section class="detail-card submission-card"><h2>Submit evidence</h2><form onsubmit={(event) => { event.preventDefault(); void submit_report() }}><input bind:value={summary} required placeholder="Short summary" /><textarea bind:value={body_markdown} required rows="8" placeholder="Markdown report"></textarea><textarea bind:value={source_urls} rows="4" placeholder="One source URL per line"></textarea><button class="button button-primary" type="submit" disabled={pending}>{pending ? 'Submitting…' : is_demo_mode() ? 'Submit demo version' : 'Submit version and hash it'}</button></form></section>
		{#if record.submissions.length > 0}<section class="detail-card"><h2>Submission history</h2>{#each record.submissions as submission}<article class="submission-item"><strong>Version {String(submission.version)}</strong><p>{String(submission.summary)}</p><code>{String(submission.manifest_hash)}</code></article>{/each}</section>{/if}
	{:else}<p class="error-copy">{error_message}</p>{/if}
	{#if action_message}<p class="success-copy">{action_message}</p>{/if}
	{#if error_message}<p class="error-copy">{error_message}</p>{/if}
	<a class="text-link" href="/dashboard">Open dashboard →</a>
</div>
