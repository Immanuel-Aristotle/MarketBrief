export type MarketContract = {
	id: string
	label: string
	price: number | null
	description: string
	instrument_symbol: string
}

export type Market = {
	id: string
	title: string
	ticker: string
	category: string
	status: string
	close_time: string | null
	contracts: MarketContract[]
}
