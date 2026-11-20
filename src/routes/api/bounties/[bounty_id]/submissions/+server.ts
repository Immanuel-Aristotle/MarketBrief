import { json } from '@sveltejs/kit'
import { env } from 'cloudflare:workers'
import type { RequestHandler } from './$types'
import { parse_json_object, required_string, require_db } from '#lib/server/bounty'

async function sha256_hex(value: string): Promise<string> {
	const bytes = new TextEncoder().encode(value)
	const digest = await crypto.subtle.digest('SHA-256', bytes)
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export const POST: RequestHandler = async ({ params, platform, request }) => {
	const db = require_db(env.DB)
	const bounty = await db.prepare('SELECT status FROM bounty WHERE id = ?').bind(params.bounty_id).first<{ status: string }>()
	if (!bounty) return json({ error: 'Bounty not found' }, { status: 404 })
	if (!['FUNDED', 'SUBMITTED'].includes(bounty.status)) return json({ error: `Cannot submit while bounty is ${bounty.status}` }, { status: 409 })
	const body = parse_json_object(await request.json(), 'request')
	const worker_wallet = required_string(body.worker_wallet, 'worker_wallet')
	const summary = required_string(body.summary, 'summary')
	const body_markdown = required_string(body.body_markdown, 'body_markdown')
	if (!Array.isArray(body.source_urls) || body.source_urls.some((url) => typeof url !== 'string' || !URL.canParse(url))) throw new Error('source_urls must contain valid URLs')
	const source_urls = JSON.stringify(body.source_urls)
	const manifest_hash = await sha256_hex(JSON.stringify({ summary, body_markdown, source_urls }))
	const latest = await db.prepare('SELECT MAX(version) AS version FROM bounty_submission WHERE bounty_id = ?').bind(params.bounty_id).first<{ version: number | null }>()
	const version = (latest?.version ?? 0) + 1
	const id = crypto.randomUUID()
	const created_at = new Date().toISOString()
	await db.batch([
		db.prepare('INSERT INTO bounty_submission (id, bounty_id, worker_wallet, summary, body_markdown, source_urls, manifest_hash, version, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id, params.bounty_id, worker_wallet, summary, body_markdown, source_urls, manifest_hash, version, created_at),
		db.prepare('UPDATE bounty SET worker_wallet = ?, status = ?, updated_at = ? WHERE id = ?').bind(worker_wallet, 'SUBMITTED', created_at, params.bounty_id)
	])
	return json({ data: { id, version, manifest_hash, created_at } }, { status: 201 })
}
