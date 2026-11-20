import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { market_from_unknown } from '#lib/server/market'

const gemini_endpoint = 'https://api.gemini.com/v1/prediction-markets/events'

export const GET: RequestHandler = async ({ fetch, url }) => {
	const query = new URLSearchParams({ status: 'active' })
	const search = url.searchParams.get('search')
	if (search) query.set('search', search)

	const response = await fetch(`${gemini_endpoint}?${query.toString()}`)
	if (!response.ok) {
		return json({ error: `Gemini market request failed with HTTP ${response.status}` }, { status: 502 })
	}

	const payload: unknown = await response.json()
	const raw_events = typeof payload === 'object' && payload !== null && 'data' in payload && Array.isArray(payload.data)
		? payload.data
		: Array.isArray(payload) ? payload : null

	if (!raw_events) {
		return json({ error: 'Gemini market response did not contain an event list' }, { status: 502 })
	}

	return json({ data: raw_events.map(market_from_unknown) })
}
