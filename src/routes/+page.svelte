<svelte:head>
	<title>MarketBrief | Evidence for uncertain markets</title>
	<meta name="description" content="Turn a prediction market question into a funded, evidence-based research task." />
</svelte:head>

<script lang="ts">
	const steps = [
		{ number: '01', title: 'Choose an event', text: 'Start with a live event and its settlement rules.' },
		{ number: '02', title: 'Fund the question', text: 'Lock a small Devnet reward against clear acceptance criteria.' },
		{ number: '03', title: 'Review the evidence', text: 'A researcher submits sources and a versioned answer.' }
	]

	const preview_market = {
		title: 'What will the next outcome say?',
		price: 0.62,
		close: 'Closes in 2 days',
		symbol: 'MARKET-PREVIEW'
	}
</script>

<div class="page-shell">
	<section class="hero panel-grid">
		<div class="hero-copy">
			<p class="eyebrow">Research infrastructure for uncertain outcomes</p>
			<h1>Good questions deserve better evidence.</h1>
			<p class="lede">MarketBrief turns a live prediction market into a small, funded research task. Lock the question, ask for sources, and release the reward only when the work is reviewed.</p>
			<div class="hero-actions">
				<a class="button button-primary" href="/markets">Browse markets <span>↗</span></a>
				<a class="button button-quiet" href="/learn">How it works <span>→</span></a>
			</div>
			<p class="fine-print">Devnet demo funds only · No market orders · Human approval stays in control</p>
		</div>

		<div class="market-preview card-shadow">
			<div class="preview-topline"><span class="status-dot"></span><span>LIVE MARKET SIGNAL</span><span class="preview-symbol">{preview_market.symbol}</span></div>
			<h2>{preview_market.title}</h2>
			<div class="probability-row">
				<div><p class="metric-label">Implied probability</p><p class="metric-value">{Math.round(preview_market.price * 100)}%</p></div>
				<div class="metric-side">{preview_market.close}</div>
			</div>
			<div class="probability-track" aria-label="62 percent implied probability"><div style={`width: ${preview_market.price * 100}%`}></div></div>
			<div class="preview-footer"><span>Research question</span><strong>What could change the settlement?</strong></div>
		</div>
	</section>

	<section class="section intro-section">
		<div class="section-heading"><p class="eyebrow">One clear loop</p><h2>From market signal to reviewed answer.</h2></div>
		<div class="step-grid">
			{#each steps as step}
				<article class="step-card"><p class="step-number">{step.number}</p><h3>{step.title}</h3><p>{step.text}</p></article>
			{/each}
		</div>
	</section>

	<section class="section principle-grid">
		<div><p class="eyebrow">Why the chain is here</p><h2>The question is off-chain. The commitment is on-chain.</h2></div>
		<div class="principle-copy"><p>Market data gives us the event to investigate. Solana holds the reward and the task state while the work is being done. The report still needs human judgment; the chain makes the funding and final payout observable.</p><a class="text-link" href="/learn">Read the plain-language guide →</a></div>
	</section>
</div>
