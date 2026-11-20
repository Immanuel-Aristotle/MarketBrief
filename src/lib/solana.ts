import type { PublicKey, Transaction } from '@solana/web3.js'
export type PhantomProvider = {
	publicKey: PublicKey | null
	connect: () => Promise<{ publicKey: PublicKey }>
	disconnect: () => Promise<void>
	signAndSendTransaction: (transaction: Transaction) => Promise<{ signature: string }>
}

export function get_rpc_url(): string {
	const rpc_url = import.meta.env.PUBLIC_SOLANA_RPC_URL
	if (!rpc_url) throw new Error('PUBLIC_SOLANA_RPC_URL is not configured')
	return rpc_url
}

export function get_phantom(): PhantomProvider {
	if (typeof window === 'undefined' || !window.solana?.isPhantom) throw new Error('Phantom wallet is not available in this browser')
	return window.solana
}

export async function connect_phantom(): Promise<PublicKey> {
	const wallet = get_phantom()
	const result = await wallet.connect()
	return result.publicKey
}

export function explorer_transaction_url(signature: string): string {
	return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}?cluster=devnet`
}

export function explorer_address_url(address: string): string {
	return `https://explorer.solana.com/address/${encodeURIComponent(address)}?cluster=devnet`
}

export async function send_devnet_lamports(recipient: string, lamports: number): Promise<string> {
	if (!Number.isSafeInteger(lamports) || lamports <= 0) throw new Error('Lamport amount must be a positive safe integer')
	const { Connection, PublicKey, SystemProgram, Transaction } = await import('@solana/web3.js')
	const wallet = get_phantom()
	const public_key = wallet.publicKey ?? (await connect_phantom())
	const connection = new Connection(get_rpc_url(), 'confirmed')
	const transaction = new Transaction().add(SystemProgram.transfer({
		fromPubkey: public_key,
		toPubkey: new PublicKey(recipient),
		lamports
	}))
	transaction.feePayer = public_key
	transaction.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash
	const { signature } = await wallet.signAndSendTransaction(transaction)
	const confirmation = await connection.confirmTransaction(signature, 'confirmed')
	if (confirmation.value.err) throw new Error(`Solana transaction failed: ${JSON.stringify(confirmation.value.err)}`)
	return signature
}
