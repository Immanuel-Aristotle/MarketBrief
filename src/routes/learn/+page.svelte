<script lang="ts">
	let probability = $state(62)
	let reward = $state(2)
	let stage = $state<'available' | 'escrowed' | 'released' | 'refunded'>('available')

	const stages = ['available', 'escrowed', 'released', 'refunded'] as const
	const stage_copy = {
		available: 'The publisher still controls the reward.',
		escrowed: 'The reward is locked while a researcher works.',
		released: 'The publisher approved the evidence and paid the researcher.',
		refunded: 'The task ended without an accepted submission; funds returned.'
	}
</script>

<svelte:head><title>Learn | MarketBrief</title><meta name="description" content="A plain-language guide to prediction markets, evidence bounties, and Solana escrow." /></svelte:head>

<div class="page-shell content-page learn-page">
	<section class="page-heading"><p class="eyebrow">A plain-language guide</p><h1>Read the signal. Check the rules. Fund the answer.</h1><p class="lede">A market price is a useful starting point, not a complete explanation. MarketBrief makes the missing context worth answering.</p></section>

	<section class="learn-block learn-demo">
		<div><p class="eyebrow">01 / The signal</p><h2>Price is a probability-shaped clue.</h2><p>For a binary outcome, a price near 62¢ is commonly read as an implied probability near 62%. It tells you where the market is leaning. It does not tell you why, what the settlement rule says, or whether the evidence is complete.</p></div>
		<div class="interactive-card">
			<div class="interactive-card-top"><span>Example market</span><strong>{probability}%</strong></div>
			<p class="interactive-title">Will the stated outcome happen?</p>
			<input class="range-input" type="range" min="1" max="99" bind:value={probability} aria-label="Implied probability" />
			<div class="range-labels"><span>Less likely</span><span>More likely</span></div>
			<div class="signal-note">At {probability}¢, the market is showing a {probability}% signal. The research question is still open.</div>
		</div>
	</section>

	<section class="learn-block two-column">
		<div><p class="eyebrow">02 / The question</p><h2>Rules are part of the outcome.</h2></div>
		<div><p>A research bounty asks someone to inspect the settlement language, identify edge cases, and attach sources. The task is locked before funding so the definition of “done” cannot change after the work arrives.</p><p>That keeps the work human and specific: the researcher explains; the publisher decides whether the evidence meets the criteria.</p></div>
	</section>

	<section class="learn-block two-column">
		<div><p class="eyebrow">03 / The escrow</p><h2>Solana holds the promise to pay.</h2></div>
		<div><p>Solana does not decide whether a report is good. It records the task state and holds the Devnet reward while the review happens. A wallet signs the funding and final decision, and the program rejects invalid state transitions.</p><div class="state-demo"><div class="state-rail">{#each stages as item, index}<button class:active={stage === item} class:visited={stages.indexOf(stage) >= index} onclick={() => stage = item}>{index + 1}</button>{#if index < stages.length - 1}<span></span>{/if}{/each}</div><div class="state-demo-copy"><strong>{stage}</strong><p>{stage_copy[stage]}</p></div></div></div>
	</section>

	<section class="learn-block learn-cta"><div><p class="eyebrow">Try the loop</p><h2>Pick an event and ask a sharper question.</h2></div><div><label class="reward-field">Demo reward (Devnet SOL)<input type="number" min="0.01" step="0.01" bind:value={reward} /></label><a class="button button-primary" href="/markets">Browse active events <span>↗</span></a></div></section>
</div>
