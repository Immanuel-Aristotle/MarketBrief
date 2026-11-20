<script lang="ts">
	import { page } from '$app/state'
	import { connect_phantom } from '#lib/solana'
	import { create_demo_record, is_demo_mode } from '#lib/demo'

	let task_title = $state('Review the settlement conditions')
	let question = $state('Inspect the market settlement terms, identify conditions that could change the YES/NO outcome, and support each conclusion with public evidence.')
	let delivery_type = $state('Settlement terms review')
	let reward = $state('0.02')
	let deadline = $state(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16))
	let submitted = $state(false)
	let pending = $state(false)
	let error_message = $state('')
	let bounty_id = $state('')

	const criteria = [
		'Cite the official market or settlement text.',
		'Identify at least two relevant edge cases.',
		'Include a source for every key conclusion.',
		'Distinguish facts, inferences, and uncertainty.'
	]

	async function create_bounty(): Promise<void> {
		pending = true
		error_message = ''
		try {
			const reward_amount_lamports = Math.round(Number(reward) * 1_000_000_000)
			if (!Number.isSafeInteger(reward_amount_lamports) || reward_amount_lamports <= 0) throw new Error('Reward must be a positive Devnet SOL amount')
			if (is_demo_mode()) {
				bounty_id = create_demo_record({ instrument_symbol: page.url.searchParams.get('instrument_symbol') ?? 'DEMO-MARKET', market_snapshot: JSON.stringify({ title: page.url.searchParams.get('title') ?? 'Demo market' }), title: task_title, question, delivery_type, acceptance_criteria: JSON.stringify(criteria), reward_amount_lamports, deadline: new Date(deadline).toISOString(), is_public: true })
				submitted = true
				return
			}
			const creator_wallet = (await connect_phantom()).toBase58()
			const response = await fetch('/api/bounties', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					instrument_symbol: page.url.searchParams.get('instrument_symbol') ?? 'UNSELECTED',
					market_snapshot: { title: page.url.searchParams.get('title') ?? 'Market selected during review' },
					title: task_title,
					question,
					delivery_type,
					acceptance_criteria: criteria,
					reward_amount_lamports,
					creator_wallet,
					deadline: new Date(deadline).toISOString(),
					is_public: true
				})
			})
			const payload: { data?: { id: string }; error?: string } = await response.json()
			if (!response.ok || !payload.data) throw new Error(payload.error ?? 'The bounty could not be saved')
			bounty_id = payload.data.id
			submitted = true
		} catch (error) {
			error_message = error instanceof Error ? error.message : 'The bounty could not be saved'
		} finally {
			pending = false
		}
	}
</script>

<svelte:head><title>Create a bounty | MarketBrief</title></svelte:head>

<div class="page-shell content-page form-page">
	<section class="page-heading"><p class="eyebrow">New research bounty</p><h1>Make the question specific enough to answer.</h1><p class="lede">The requirements are saved as a draft first. Funding is a separate wallet-signing step, so you can edit the task before money moves.</p></section>
	{#if submitted}<div class="state-card"><strong>{is_demo_mode() ? 'Demo draft saved.' : 'Draft saved.'}</strong><p>Task <code>{bounty_id}</code> is {is_demo_mode() ? 'a local reviewer simulation. No funds moved.' : 'still editable and has not moved any funds.'}</p><a class="button button-primary" href={`/bounties/${bounty_id}`}>Open bounty <span>→</span></a></div>{:else}<form class="bounty-form" onsubmit={(event) => { event.preventDefault(); void create_bounty() }}><label>Task title<input bind:value={task_title} required /></label><label>Research question<textarea bind:value={question} required rows="5"></textarea></label><label>Delivery type<select bind:value={delivery_type}><option>Settlement terms review</option><option>Source verification</option><option>Event background analysis</option></select></label><label>Reward in Devnet SOL<input bind:value={reward} type="number" min="0.001" step="0.001" required /></label><label>Submission deadline<input bind:value={deadline} type="datetime-local" required /></label><fieldset><legend>Acceptance criteria</legend>{#each criteria as criterion}<label class="check-row"><input type="checkbox" checked disabled /> {criterion}</label>{/each}</fieldset>{#if error_message}<p class="error-copy">{error_message}</p>{/if}<button class="button button-primary" type="submit" disabled={pending}>{pending ? 'Saving draft…' : is_demo_mode() ? 'Save demo draft' : 'Connect wallet and save draft'} <span>→</span></button></form>{/if}
</div>
