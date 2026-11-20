const demo_mode_key = 'marketbrief_demo_mode'
const demo_bounty_key = 'marketbrief_demo_bounty'

export type DemoRecord = {
	bounty: Record<string, unknown>
	submissions: Array<Record<string, unknown>>
	reviews: Array<Record<string, unknown>>
}

function browser_storage(): Storage {
	if (typeof window === 'undefined') throw new Error('Demo mode is only available in a browser')
	return window.localStorage
}

function seeded_record(): DemoRecord {
	return {
		bounty: {
			id: 'demo-bounty',
			instrument_symbol: 'NCAAM-2611201730-MINN-OKST-M',
			market_snapshot: JSON.stringify({ title: 'Minnesota vs Oklahoma State' }),
			title: 'Demo: verify the Oklahoma State settlement rule',
			question: 'Check the official settlement conditions and identify what evidence would resolve this market.',
			delivery_type: 'Settlement terms review',
			acceptance_criteria: JSON.stringify(['Cite the official market text.', 'Identify at least two edge cases.', 'Link every key conclusion to a source.']),
			reward_amount_lamports: 20000000,
			creator_wallet: 'demo-creator-wallet',
			worker_wallet: 'demo-researcher-wallet',
			deadline: new Date(Date.now() + 5 * 86400000).toISOString(),
			status: 'FUNDED',
			escrow_account: 'demo-escrow-no-chain',
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		},
		submissions: [{ version: 1, summary: 'The market uses the official game result and names its source hierarchy.', body_markdown: 'This is a simulated reviewer submission. In a real bounty, the researcher would attach the source-backed report here.', source_urls: ['https://api.gemini.com/v1/prediction-markets/events'], manifest_hash: 'demo-manifest-hash-no-chain', created_at: new Date().toISOString() }],
		reviews: []
	}
}

export function is_demo_mode(): boolean {
	return typeof window !== 'undefined' && browser_storage().getItem(demo_mode_key) === 'true'
}

export function set_demo_mode(enabled: boolean): void {
	const storage = browser_storage()
	storage.setItem(demo_mode_key, String(enabled))
	if (enabled && !storage.getItem(demo_bounty_key)) storage.setItem(demo_bounty_key, JSON.stringify(seeded_record()))
}

export function get_demo_record(id: string): DemoRecord | null {
	if (!is_demo_mode()) return null
	const raw = browser_storage().getItem(demo_bounty_key)
	if (!raw) return id === 'demo-bounty' ? seeded_record() : null
	const record = JSON.parse(raw) as DemoRecord
	return String(record.bounty.id) === id ? record : null
}

export function get_demo_bounties(): Array<Record<string, unknown>> {
	if (!is_demo_mode()) return []
	const raw = browser_storage().getItem(demo_bounty_key)
	if (!raw) return []
	const record = JSON.parse(raw) as DemoRecord
	return [record.bounty]
}

export function save_demo_record(record: DemoRecord): void {
	browser_storage().setItem(demo_bounty_key, JSON.stringify(record))
}

export function create_demo_record(input: Record<string, unknown>): string {
	const id = `demo-bounty-${Date.now()}`
	const record: DemoRecord = {
		bounty: { ...input, id, creator_wallet: 'demo-creator-wallet', status: 'DRAFT', escrow_account: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
		submissions: [],
		reviews: []
	}
	save_demo_record(record)
	return id
}
