import { error } from '@sveltejs/kit'

export type BountyStatus = 'DRAFT' | 'FUNDED' | 'SUBMITTED' | 'APPROVED' | 'RELEASED' | 'REFUNDED' | 'EXPIRED'

export type BountyRecord = {
	id: string
	instrument_symbol: string
	market_snapshot: string
	title: string
	question: string
	delivery_type: string
	acceptance_criteria: string
	reward_amount_lamports: number
	reward_asset: string
	creator_wallet: string
	worker_wallet: string | null
	escrow_account: string | null
	status: BountyStatus
	funding_signature: string | null
	release_signature: string | null
	refund_signature: string | null
	deadline: string
	is_public: number
	created_at: string
	updated_at: string
}

export function require_db(db: D1Database | undefined): D1Database {
	if (!db) throw error(503, 'D1 binding DB is not configured')
	return db
}

export function parse_json_object(value: unknown, field: string): Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) throw error(400, `${field} must be an object`)
	return value as Record<string, unknown>
}

export function required_string(value: unknown, field: string): string {
	if (typeof value !== 'string' || value.trim() === '') throw error(400, `${field} is required`)
	return value.trim()
}

export function required_positive_integer(value: unknown, field: string): number {
	const parsed = typeof value === 'number' ? value : Number(value)
	if (!Number.isSafeInteger(parsed) || parsed <= 0) throw error(400, `${field} must be a positive integer`)
	return parsed
}
