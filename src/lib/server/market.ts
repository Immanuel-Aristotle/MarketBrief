import type { Market, MarketContract } from '#lib/types'

function read_text(value: unknown): string {
	return typeof value === 'string' ? value : ''
}

function read_number(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) return value
	if (typeof value === 'string' && Number.isFinite(Number(value))) return Number(value)
	return null
}

function rich_text_to_string(value: unknown): string {
	if (typeof value === 'string') return value
	if (Array.isArray(value)) return value.map(rich_text_to_string).join('')
	if (typeof value !== 'object' || value === null) return ''
	const node = value as Record<string, unknown>
	if (typeof node.value === 'string') return node.value
	if (Array.isArray(node.content)) return node.content.map(rich_text_to_string).join('')
	return ''
}

function contract_from_unknown(value: unknown): MarketContract {
	const contract = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
	const description = contract.description
	const description_text = typeof description === 'string'
		? description
		: typeof description === 'object' && description !== null
			? rich_text_to_string(description)
			: ''
	const prices = typeof contract.prices === 'object' && contract.prices !== null ? contract.prices as Record<string, unknown> : {}

	return {
		id: read_text(contract.id),
		label: read_text(contract.label) || read_text(contract.name) || 'Outcome',
		price: read_number(contract.price ?? contract.lastPrice ?? contract.yesPrice ?? prices.lastTradePrice),
		description: description_text,
		instrument_symbol: read_text(contract.instrumentSymbol) || read_text(contract.symbol)
	}
}

export function market_from_unknown(value: unknown): Market {
	const event = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
	const contracts = Array.isArray(event.contracts) ? event.contracts.map(contract_from_unknown) : []
	return {
		id: read_text(event.id) || read_text(event.ticker),
		title: read_text(event.title) || read_text(event.name) || 'Untitled event',
		ticker: read_text(event.ticker),
		category: read_text(event.category) || 'Other',
		status: read_text(event.status) || 'unknown',
		close_time: read_text(event.closeTime) || read_text(event.close_time) || read_text(event.expiryDate) || null,
		contracts
	}
}
