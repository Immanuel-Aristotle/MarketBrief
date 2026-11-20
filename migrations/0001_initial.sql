CREATE TABLE IF NOT EXISTS bounty (
	id TEXT PRIMARY KEY,
	instrument_symbol TEXT NOT NULL,
	market_snapshot TEXT NOT NULL,
	title TEXT NOT NULL,
	question TEXT NOT NULL,
	delivery_type TEXT NOT NULL,
	acceptance_criteria TEXT NOT NULL,
	reward_amount_lamports INTEGER NOT NULL,
	reward_asset TEXT NOT NULL DEFAULT 'SOL_DEVNET',
	creator_wallet TEXT NOT NULL,
	worker_wallet TEXT,
	escrow_account TEXT,
	status TEXT NOT NULL DEFAULT 'DRAFT',
	funding_signature TEXT,
	release_signature TEXT,
	refund_signature TEXT,
	deadline TEXT NOT NULL,
	is_public INTEGER NOT NULL DEFAULT 1,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bounty_submission (
	id TEXT PRIMARY KEY,
	bounty_id TEXT NOT NULL REFERENCES bounty(id),
	worker_wallet TEXT NOT NULL,
	summary TEXT NOT NULL,
	body_markdown TEXT NOT NULL,
	source_urls TEXT NOT NULL,
	manifest_hash TEXT NOT NULL,
	version INTEGER NOT NULL,
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS escrow_transaction (
	id TEXT PRIMARY KEY,
	bounty_id TEXT NOT NULL REFERENCES bounty(id),
	action TEXT NOT NULL,
	signature TEXT NOT NULL,
	status TEXT NOT NULL,
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS review (
	id TEXT PRIMARY KEY,
	bounty_id TEXT NOT NULL REFERENCES bounty(id),
	submission_id TEXT,
	reviewer_wallet TEXT NOT NULL,
	action TEXT NOT NULL,
	note TEXT NOT NULL,
	created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS bounty_status_idx ON bounty(status);
CREATE INDEX IF NOT EXISTS submission_bounty_idx ON bounty_submission(bounty_id, version DESC);
