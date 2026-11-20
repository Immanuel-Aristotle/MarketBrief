import { json } from '@sveltejs/kit'
import { env } from 'cloudflare:workers'
import type { RequestHandler } from './$types'
import { parse_json_object, required_positive_integer, required_string, require_db } from '#lib/server/bounty'

export const GET: RequestHandler = async ({ platform, url }) => {
	const db = require_db(env.DB)
	const status = url.searchParams.get('status')
	const query = status
		? db.prepare('SELECT * FROM bounty WHERE status = ? ORDER BY created_at DESC').bind(status)
		: db.prepare('SELECT * FROM bounty WHERE is_public = 1 ORDER BY created_at DESC')
	const result = await query.all()
	return json({ data: result.results })
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = require_db(env.DB)
	const body = parse_json_object(await request.json(), 'request')
	const id = crypto.randomUUID()
	const now = new Date().toISOString()
	const instrument_symbol = required_string(body.instrument_symbol, 'instrument_symbol')
	const market_snapshot = JSON.stringify(body.market_snapshot ?? {})
	const title = required_string(body.title, 'title')
	const question = required_string(body.question, 'question')
	const delivery_type = required_string(body.delivery_type, 'delivery_type')
	const acceptance_criteria = JSON.stringify(body.acceptance_criteria)
	if (!Array.isArray(body.acceptance_criteria) || body.acceptance_criteria.length < 3) throw new Error('acceptance_criteria must contain at least three items')
	const reward_amount_lamports = required_positive_integer(body.reward_amount_lamports, 'reward_amount_lamports')
	const creator_wallet = required_string(body.creator_wallet, 'creator_wallet')
	const deadline = required_string(body.deadline, 'deadline')
	const is_public = body.is_public === false ? 0 : 1
	await db.prepare(`INSERT INTO bounty (id, instrument_symbol, market_snapshot, title, question, delivery_type, acceptance_criteria, reward_amount_lamports, creator_wallet, deadline, is_public, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, instrument_symbol, market_snapshot, title, question, delivery_type, acceptance_criteria, reward_amount_lamports, creator_wallet, deadline, is_public, now, now).run()
	return json({ data: { id, status: 'DRAFT', created_at: now } }, { status: 201 })
}
