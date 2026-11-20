# MarketBrief escrow program

This is a small native Solana program for the Devnet demo. It stores the creator, worker, reward amount, deadline, market-summary hash, submission hash, and escrow status in a PDA derived from `escrow`, creator wallet, and summary hash.

Instruction discriminators are `0 init`, `1 fund`, `2 submit`, `3 release`, `4 approve`, and `5 refund`. The program owns all state transitions; a browser cannot mark a bounty as paid by changing D1 alone.
