<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/state'
import type { Market } from '#lib/types'

	let market = $state<Market | null>(null)
	let loading = $state(true)
	let error_message = $state('')

	onMount(async () => {
		const instrument_symbol = page.params.instrument_symbol
		if (!instrument_symbol) {
			error_message = 'Market symbol is missing.'
			loading = false
			return
		}
		const response = await fetch(`/api/markets/${encodeURIComponent(instrument_symbol)}`)
		const payload: unknown = await response.json()
		if (!response.ok || typeof payload !== 'object' || payload === null || !('data' in payload)) {
			error_message = typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string' ? payload.error : 'Unable to load this market.'
			loading = false
			return
		}
		market = payload.data as Market
		loading = false
	})
</script>

<svelte:head><title>{market ? `${market.title} | MarketBrief` : 'Market detail | MarketBrief'}</title></svelte:head>

<div class="page-shell content-page">
	{#if loading}<div class="state-card">Loading market detail…</div>
	{:else if error_message}<div class="state-card error-state"><strong>Market unavailable</strong><p>{error_message}</p><a class="button button-primary" href="/markets">Back to markets</a></div>
	{:else if market}<section class="detail-layout"><div><p class="eyebrow">{market.category} / {market.status}</p><h1>{market.title}</h1><p class="market-ticker">{market.ticker || market.id}</p><p class="lede">Inspect the outcomes and turn an unclear settlement condition into a research question.</p><a class="button button-primary" href={`/bounties/new?market=${encodeURIComponent(market.ticker || market.id)}`}>Create a research bounty <span>↗</span></a></div><aside class="detail-card"><p class="metric-label">Outcomes</p>{#each market.contracts as contract}<div class="outcome-row"><div><strong>{contract.label}</strong><p>{contract.description.slice(0, 160)}{contract.description.length > 160 ? '…' : ''}</p></div><span>{contract.price !== null ? `${Math.round(contract.price * 100)}¢` : '—'}</span></div>{/each}<div class="detail-meta"><span>Close</span><strong>{market.close_time || 'Not provided'}</strong></div></aside></section>{/if}
</div>
