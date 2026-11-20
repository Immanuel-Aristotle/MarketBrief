<script lang="ts">
	import './layout.css'
	import { onMount } from 'svelte'
	import { is_demo_mode, set_demo_mode } from '#lib/demo'
	import type { LayoutProps } from './$types'

	let { children }: LayoutProps = $props()
	let demo_enabled = $state(false)

	onMount(() => { demo_enabled = is_demo_mode() })

	function toggle_demo_mode(): void {
		set_demo_mode(!demo_enabled)
		window.location.reload()
	}
</script>

<svelte:head>
	<meta name="theme-color" content="#f4f1ea" />
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
</svelte:head>

<header class="site-header">
	<a class="brand" href="/" aria-label="MarketBrief home"><span class="brand-mark">M</span><span>MarketBrief</span></a>
	<nav aria-label="Primary navigation"><a href="/learn">Learn</a><a href="/markets">Markets</a><button class:demo-active={demo_enabled} class="demo-toggle" type="button" onclick={toggle_demo_mode} aria-pressed={demo_enabled}><span class="demo-dot"></span>Demo Mode {demo_enabled ? 'On' : 'Off'}</button><a class="nav-cta" href="/bounties/new">Create a bounty <span>↗</span></a></nav>
</header>

{#if demo_enabled}<div class="demo-banner" role="status"><strong>Demo Mode</strong><span>Reviewer simulation: no wallet connection or real Solana transaction is required.</span><a href="/dashboard">Open demo dashboard →</a></div>{/if}

{@render children()}

<footer class="site-footer"><p>MarketBrief / Devnet prototype</p><p>Evidence before payout.</p></footer>
