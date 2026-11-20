import { json } from '@sveltejs/kit'
import { env } from 'cloudflare:workers'
import type { RequestHandler } from './$types'
import { parse_json_object, required_string, require_db } from '#lib/server/bounty'

const valid_actions = new Set(['REVISION', 'APPROVE', 'REFUND'])

export const POST: RequestHandler = async ({ params, platform, request }) => {
	const db = require_db(env.DB)
	const body = parse_json_object(await request.json(), 'request')
	const action = required_string(body.action, 'action')
	if (!valid_actions.has(action)) return json({ error: 'action must be REVISION, APPROVE, or REFUND' }, { status: 400 })
	const reviewer_wallet = required_string(body.reviewer_wallet, 'reviewer_wallet')
	const note = required_string(body.note, 'note')
	const bounty = await db.prepare('SELECT creator_wallet, status FROM bounty WHERE id = ?').bind(params.bounty_id).first<{ creator_wallet: string; status: string }>()
	if (!bounty) return json({ error: 'Bounty not found' }, { status: 404 })
	if (bounty.creator_wallet !== reviewer_wallet) return json({ error: 'Only the creator wallet can review this bounty' }, { status: 403 })
	if (action === 'APPROVE' && bounty.status !== 'SUBMITTED') return json({ error: 'Only a submitted bounty can be approved' }, { status: 409 })
	if (action === 'REFUND' && bounty.status !== 'FUNDED') return json({ error: `Cannot refund while bounty is ${bounty.status}; a submitted report must be reviewed first` }, { status: 409 })
	const next_status = action === 'REVISION' ? 'FUNDED' : bounty.status
	const now = new Date().toISOString()
	const review_id = crypto.randomUUID()
	await db.batch([
		db.prepare('INSERT INTO review (id, bounty_id, reviewer_wallet, action, note, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(review_id, params.bounty_id, reviewer_wallet, action, note, now),
		db.prepare('UPDATE bounty SET status = ?, updated_at = ? WHERE id = ?').bind(next_status, now, params.bounty_id)
	])
	return json({ data: { review_id, status: next_status, created_at: now, chain_action_required: action === 'APPROVE' || action === 'REFUND' } })
}
