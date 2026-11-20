import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js'
import { get_phantom, get_rpc_url } from '#lib/solana'

const public_program_id = import.meta.env.PUBLIC_SOLANA_PROGRAM_ID
if (!public_program_id) throw new Error('PUBLIC_SOLANA_PROGRAM_ID is not configured')
export const escrow_program_id = new PublicKey(public_program_id)

function u64_le(value: number | bigint): Uint8Array {
	const result = new Uint8Array(8)
	let remaining = BigInt(value)
	for (let index = 0; index < result.length; index += 1) {
		result[index] = Number(remaining & 255n)
		remaining >>= 8n
	}
	return result
}

function i64_le(value: number): Uint8Array {
	return u64_le(BigInt.asUintN(64, BigInt(value)))
}

function concat_bytes(...values: Uint8Array[]): Uint8Array {
	const length = values.reduce((total, value) => total + value.length, 0)
	const result = new Uint8Array(length)
	let offset = 0
	for (const value of values) {
		result.set(value, offset)
		offset += value.length
	}
	return result
}

export async function manifest_hash(value: string): Promise<Uint8Array> {
	return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))
}

export async function derive_escrow_pda(creator: PublicKey, summary_hash: Uint8Array): Promise<[PublicKey, number]> {
	return PublicKey.findProgramAddress([new TextEncoder().encode('escrow'), creator.toBytes(), summary_hash], escrow_program_id)
}

export function build_init_instruction(creator: PublicKey, escrow: PublicKey, summary_hash: Uint8Array, amount_lamports: number, deadline: number): TransactionInstruction {
	const data = concat_bytes(new Uint8Array([0]), i64_le(deadline), u64_le(amount_lamports), summary_hash)
	return new TransactionInstruction({ programId: escrow_program_id, keys: [{ pubkey: creator, isSigner: true, isWritable: true }, { pubkey: escrow, isSigner: false, isWritable: true }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }], data })
}

export function build_fund_instruction(creator: PublicKey, escrow: PublicKey, amount_lamports: number): TransactionInstruction {
	return new TransactionInstruction({ programId: escrow_program_id, keys: [{ pubkey: creator, isSigner: true, isWritable: true }, { pubkey: escrow, isSigner: false, isWritable: true }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }], data: concat_bytes(new Uint8Array([1]), u64_le(amount_lamports)) })
}

export function build_submit_instruction(worker: PublicKey, escrow: PublicKey, submission_hash: Uint8Array): TransactionInstruction {
	return new TransactionInstruction({ programId: escrow_program_id, keys: [{ pubkey: worker, isSigner: true, isWritable: false }, { pubkey: escrow, isSigner: false, isWritable: true }], data: concat_bytes(new Uint8Array([2]), submission_hash) })
}

export function build_approve_instruction(creator: PublicKey, escrow: PublicKey): TransactionInstruction {
	return new TransactionInstruction({ programId: escrow_program_id, keys: [{ pubkey: creator, isSigner: true, isWritable: true }, { pubkey: escrow, isSigner: false, isWritable: true }], data: new Uint8Array([4]) })
}

export function build_payout_instruction(creator: PublicKey, recipient: PublicKey, escrow: PublicKey, refund: boolean): TransactionInstruction {
	return new TransactionInstruction({ programId: escrow_program_id, keys: [{ pubkey: creator, isSigner: true, isWritable: true }, { pubkey: recipient, isSigner: false, isWritable: true }, { pubkey: escrow, isSigner: false, isWritable: true }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }], data: new Uint8Array([refund ? 5 : 3]) })
}

export async function sign_and_confirm(instruction: TransactionInstruction): Promise<string> {
	const wallet = get_phantom()
	const creator = wallet.publicKey ?? (await wallet.connect()).publicKey
	const connection = new Connection(get_rpc_url(), 'confirmed')
	const transaction = new Transaction().add(instruction)
	transaction.feePayer = creator
	transaction.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash
	const { signature } = await wallet.signAndSendTransaction(transaction)
	const confirmation = await connection.confirmTransaction(signature, 'confirmed')
	if (confirmation.value.err) throw new Error(`Solana transaction failed: ${JSON.stringify(confirmation.value.err)}`)
	return signature
}
