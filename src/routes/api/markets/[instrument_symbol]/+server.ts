import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { market_from_unknown } from '#lib/server/market'

export const GET: RequestHandler = async ({ fetch, params }) => {
	const response = await fetch('https://api.gemini.com/v1/prediction-markets/events?status=active')
	if (!response.ok) return json({ error: `Gemini market request failed with HTTP ${response.status}` }, { status: 502 })
	const payload: unknown = await response.json()
	const raw_events = typeof payload === 'object' && payload !== null && 'data' in payload && Array.isArray(payload.data) ? payload.data : []
	const event = raw_events.find((value) => JSON.stringify(value).includes(params.instrument_symbol))
	if (!event) return json({ error: 'Market event was not found in the active event list' }, { status: 404 })
	return json({ data: market_from_unknown(event) })
}
