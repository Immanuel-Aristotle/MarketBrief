import { json } from '@sveltejs/kit'
import { env } from 'cloudflare:workers'
import type { RequestHandler } from './$types'
import { parse_json_object, required_string, require_db } from '#lib/server/bounty'

export const GET: RequestHandler = async ({ params, platform }) => {
	const db = require_db(env.DB)
	const bounty = await db.prepare('SELECT * FROM bounty WHERE id = ?').bind(params.bounty_id).first()
	if (!bounty) return json({ error: 'Bounty not found' }, { status: 404 })
	const submissions = await db.prepare('SELECT * FROM bounty_submission WHERE bounty_id = ? ORDER BY version DESC').bind(params.bounty_id).all()
	const reviews = await db.prepare('SELECT * FROM review WHERE bounty_id = ? ORDER BY created_at DESC').bind(params.bounty_id).all()
	return json({ data: { bounty, submissions: submissions.results, reviews: reviews.results } })
}

export const PATCH: RequestHandler = async ({ params, platform, request }) => {
	const db = require_db(env.DB)
	const body = parse_json_object(await request.json(), 'request')
	const bounty = await db.prepare('SELECT status FROM bounty WHERE id = ?').bind(params.bounty_id).first<{ status: string }>()
	if (!bounty) return json({ error: 'Bounty not found' }, { status: 404 })
	const action = typeof body.action === 'string' ? body.action : 'edit'
	if (action === 'fund' || action === 'release' || action === 'refund') {
		const signature = required_string(body.signature, 'signature')
		const wallet = required_string(body.wallet, 'wallet')
		const escrow_account = typeof body.escrow_account === 'string' ? body.escrow_account : null
		if (wallet !== (await db.prepare('SELECT creator_wallet FROM bounty WHERE id = ?').bind(params.bounty_id).first<{ creator_wallet: string }>())?.creator_wallet) return json({ error: 'Only the creator wallet can record escrow transitions' }, { status: 403 })
		const transition = action === 'fund' ? { from: 'DRAFT', to: 'FUNDED', column: 'funding_signature' } : action === 'release' ? { from: 'SUBMITTED', to: 'RELEASED', column: 'release_signature' } : { from: 'FUNDED', to: 'REFUNDED', column: 'refund_signature' }
		if (bounty.status !== transition.from) return json({ error: `Cannot ${action} while bounty is ${bounty.status}` }, { status: 409 })
		const now = new Date().toISOString()
		await db.prepare(`UPDATE bounty SET status = ?, ${transition.column} = ?, escrow_account = COALESCE(?, escrow_account), updated_at = ? WHERE id = ?`).bind(transition.to, signature, escrow_account, now, params.bounty_id).run()
		await db.prepare('INSERT INTO escrow_transaction (id, bounty_id, action, signature, status, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), params.bounty_id, action, signature, 'CONFIRMED', now).run()
		return json({ data: { id: params.bounty_id, status: transition.to, signature, created_at: now } })
	}
	if (bounty.status !== 'DRAFT') return json({ error: 'Bounty requirements are locked after funding' }, { status: 409 })
	const title = required_string(body.title, 'title')
	const question = required_string(body.question, 'question')
	const deadline = required_string(body.deadline, 'deadline')
	const now = new Date().toISOString()
	await db.prepare('UPDATE bounty SET title = ?, question = ?, deadline = ?, updated_at = ? WHERE id = ?').bind(title, question, deadline, now, params.bounty_id).run()
	return json({ data: { id: params.bounty_id, status: 'DRAFT', updated_at: now } })
}
