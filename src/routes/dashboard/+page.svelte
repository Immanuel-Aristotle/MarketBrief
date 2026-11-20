<script lang="ts">
	import { onMount } from 'svelte'
	import { get_demo_bounties, is_demo_mode } from '#lib/demo'
	let bounties = $state<Array<Record<string, unknown>>>([])
	let error_message = $state('')
	onMount(async () => {
		if (is_demo_mode()) { bounties = get_demo_bounties(); return }
		const response = await fetch('/api/bounties')
		const payload: { data?: Array<Record<string, unknown>>; error?: string } = await response.json()
		if (!response.ok || !payload.data) { error_message = payload.error ?? 'Dashboard could not be loaded'; return }
		bounties = payload.data
	})
</script>

<svelte:head><title>Dashboard | MarketBrief</title></svelte:head>
<div class="page-shell content-page"><section class="page-heading"><p class="eyebrow">Dashboard</p><h1>Research tasks with a visible trail.</h1><p class="lede">Drafts are editable. Once escrow is funded, requirements lock and every report gets a content hash.</p></section>{#if error_message}<p class="error-copy">{error_message}</p>{:else if bounties.length === 0}<div class="empty-state"><strong>No public bounties yet.</strong><p>Create the first research task from an active market.</p><a class="button button-primary" href="/markets">Browse markets</a></div>{:else}<div class="market-grid">{#each bounties as bounty}<a class="market-card" href={`/bounties/${String(bounty.id)}`}><div class="market-card-top"><span class="market-category">{String(bounty.status)}</span><span class="market-ticker">{String(bounty.instrument_symbol)}</span></div><h2>{String(bounty.title)}</h2><p>{String(bounty.question)}</p><span class="text-link">Open task →</span></a>{/each}</div>{/if}</div>
