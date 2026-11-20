<script lang="ts">
	import { onMount } from 'svelte'
import type { Market } from '#lib/types'

	let markets: Market[] = $state([])
	let loading = $state(true)
	let error_message = $state('')
	let search = $state('')

	async function load_markets() {
		loading = true
		error_message = ''
		const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''
		const response = await fetch(`/api/markets${query}`)
		const payload: unknown = await response.json()
		if (!response.ok || typeof payload !== 'object' || payload === null || !('data' in payload) || !Array.isArray(payload.data)) {
			error_message = typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string' ? payload.error : 'Unable to load market events.'
			loading = false
			return
		}
		markets = payload.data as Market[]
		loading = false
	}

	onMount(() => { void load_markets() })
</script>

<svelte:head><title>Markets | MarketBrief</title><meta name="description" content="Browse active prediction market events and choose a research question." /></svelte:head>

<div class="page-shell content-page">
	<section class="page-heading"><p class="eyebrow">Live event index</p><h1>Find a question worth investigating.</h1><p class="lede">Choose an active event, inspect its outcomes, and turn an unclear settlement rule into a focused research bounty.</p></section>

	<div class="toolbar">
		<label class="search-box"><span class="sr-only">Search markets</span><input bind:value={search} placeholder="Search events" onkeydown={(event) => event.key === 'Enter' && load_markets()} /><span>⌕</span></label>
		<button class="button button-primary" onclick={load_markets}>Refresh events</button>
	</div>

	{#if loading}<div class="state-card">Loading active events…</div>
	{:else if error_message}<div class="state-card error-state"><strong>Market data unavailable</strong><p>{error_message}</p><button class="button button-primary" onclick={load_markets}>Try again</button></div>
	{:else if markets.length === 0}<div class="state-card">No active events matched that search.</div>
	{:else}<div class="market-grid">
		{#each markets as market}
			<a class="market-card" href={`/markets/${encodeURIComponent(market.ticker || market.id)}`}>
				<div class="market-card-top"><span class="category-tag">{market.category}</span><span class="market-status">{market.status}</span></div>
				<h2>{market.title}</h2>
				<p class="market-ticker">{market.ticker || market.id}</p>
				<div class="market-card-bottom"><span>{market.contracts.length} outcomes</span><span>{market.close_time ? `Closes ${market.close_time}` : 'Close time unavailable'} ↗</span></div>
			</a>
		{/each}
	</div>{/if}
</div>
