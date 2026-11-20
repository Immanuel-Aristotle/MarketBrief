use solana_program::{
	account_info::{next_account_info, AccountInfo},
	entrypoint,
	entrypoint::ProgramResult,
	msg,
	program::{invoke, invoke_signed},
	program_error::ProgramError,
	pubkey::Pubkey,
	rent::Rent,
	system_instruction,
	sysvar::Sysvar,
};

solana_program::declare_id!("6wWCsbhqS16ZU3JsKUmhwwZ5VdwQD5Rzk6EwPcheHKF4");

const STATE_SIZE: usize = 153;
const STATUS_DRAFT: u8 = 0;
const STATUS_FUNDED: u8 = 1;
const STATUS_SUBMITTED: u8 = 2;
const STATUS_APPROVED: u8 = 3;
const STATUS_RELEASED: u8 = 4;
const STATUS_REFUNDED: u8 = 5;

entrypoint!(process_instruction);

fn read_u64(input: &[u8], start: usize) -> Result<u64, ProgramError> {
	let bytes = input.get(start..start + 8).ok_or(ProgramError::InvalidInstructionData)?;
	let array: [u8; 8] = bytes.try_into().map_err(|_| ProgramError::InvalidInstructionData)?;
	Ok(u64::from_le_bytes(array))
}

fn read_i64(input: &[u8], start: usize) -> Result<i64, ProgramError> {
	Ok(read_u64(input, start)? as i64)
}

fn read_hash(input: &[u8], start: usize) -> Result<[u8; 32], ProgramError> {
	let bytes = input.get(start..start + 32).ok_or(ProgramError::InvalidInstructionData)?;
	bytes.try_into().map_err(|_| ProgramError::InvalidInstructionData)
}

fn state_status(state: &AccountInfo) -> Result<u8, ProgramError> {
	state.try_borrow_data()?.get(0).copied().ok_or(ProgramError::InvalidAccountData)
}

fn set_bytes(state: &AccountInfo, offset: usize, bytes: &[u8]) -> ProgramResult {
	let end = offset + bytes.len();
	let mut data = state.try_borrow_mut_data()?;
	data.get_mut(offset..end).ok_or(ProgramError::InvalidAccountData)?.copy_from_slice(bytes);
	Ok(())
}

fn require_state(program_id: &Pubkey, state: &AccountInfo) -> ProgramResult {
	if state.owner != program_id || state.data_len() != STATE_SIZE { return Err(ProgramError::InvalidAccountData) }
	let data = state.try_borrow_data()?;
	let creator = Pubkey::new_from_array(data[1..33].try_into().map_err(|_| ProgramError::InvalidAccountData)?);
	let summary_hash: [u8; 32] = data[81..113].try_into().map_err(|_| ProgramError::InvalidAccountData)?;
	let (expected, _) = Pubkey::find_program_address(&[b"escrow", creator.as_ref(), &summary_hash], program_id);
	if state.key != &expected { return Err(ProgramError::InvalidAccountData) }
	Ok(())
}

fn require_creator(program_id: &Pubkey, state: &AccountInfo, creator: &AccountInfo) -> ProgramResult {
	require_state(program_id, state)?;
	if !creator.is_signer || !creator.is_writable { return Err(ProgramError::MissingRequiredSignature) }
	let data = state.try_borrow_data()?;
	if data.get(1..33) != Some(creator.key.as_ref()) { return Err(ProgramError::IllegalOwner) }
	Ok(())
}

fn process_init(program_id: &Pubkey, accounts: &[AccountInfo], input: &[u8]) -> ProgramResult {
	if input.len() != 1 + 8 + 8 + 32 { return Err(ProgramError::InvalidInstructionData) }
	let accounts_iter = &mut accounts.iter();
	let creator = next_account_info(accounts_iter)?;
	let state = next_account_info(accounts_iter)?;
	let system_program = next_account_info(accounts_iter)?;
	if !creator.is_signer || !creator.is_writable || !state.is_writable || system_program.key != &solana_program::system_program::id() { return Err(ProgramError::InvalidAccountData) }
	let deadline = read_i64(input, 1)?;
	let amount = read_u64(input, 9)?;
	let summary_hash = read_hash(input, 17)?;
	let (expected_state, bump) = Pubkey::find_program_address(&[b"escrow", creator.key.as_ref(), &summary_hash], program_id);
	if state.key != &expected_state || state.lamports() != 0 { return Err(ProgramError::AccountAlreadyInitialized) }
	let rent = Rent::get()?.minimum_balance(STATE_SIZE);
	let seeds: &[&[u8]] = &[b"escrow", creator.key.as_ref(), &summary_hash, &[bump]];
	invoke_signed(&system_instruction::create_account(creator.key, state.key, rent, STATE_SIZE as u64, program_id), &[creator.clone(), state.clone(), system_program.clone()], &[seeds])?;
	set_bytes(state, 0, &[STATUS_DRAFT])?;
	set_bytes(state, 1, creator.key.as_ref())?;
	set_bytes(state, 33, &[0; 32])?;
	set_bytes(state, 65, &amount.to_le_bytes())?;
	set_bytes(state, 73, &deadline.to_le_bytes())?;
	set_bytes(state, 81, &summary_hash)?;
	set_bytes(state, 113, &[0; 32])?;
	msg!("MarketBrief escrow initialized");
	Ok(())
}

fn process_fund(program_id: &Pubkey, accounts: &[AccountInfo], input: &[u8]) -> ProgramResult {
	if input.len() != 9 { return Err(ProgramError::InvalidInstructionData) }
	let accounts_iter = &mut accounts.iter();
	let creator = next_account_info(accounts_iter)?;
	let state = next_account_info(accounts_iter)?;
	let system_program = next_account_info(accounts_iter)?;
	let amount = read_u64(input, 1)?;
	require_creator(program_id, state, creator)?;
	if state_status(state)? != STATUS_DRAFT || amount != read_u64(&state.try_borrow_data()?, 65)? { return Err(ProgramError::InvalidAccountData) }
	invoke(&system_instruction::transfer(creator.key, state.key, amount), &[creator.clone(), state.clone(), system_program.clone()])?;
	set_bytes(state, 0, &[STATUS_FUNDED])?;
	Ok(())
}

fn process_submit(program_id: &Pubkey, accounts: &[AccountInfo], input: &[u8]) -> ProgramResult {
	if input.len() != 33 { return Err(ProgramError::InvalidInstructionData) }
	let accounts_iter = &mut accounts.iter();
	let worker = next_account_info(accounts_iter)?;
	let state = next_account_info(accounts_iter)?;
	require_state(program_id, state)?;
	if !worker.is_signer || !state.is_writable || state_status(state)? != STATUS_FUNDED { return Err(ProgramError::InvalidAccountData) }
	set_bytes(state, 0, &[STATUS_SUBMITTED])?;
	set_bytes(state, 33, worker.key.as_ref())?;
	set_bytes(state, 113, &read_hash(input, 1)?)?;
	Ok(())
}

fn process_approve(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
	let accounts_iter = &mut accounts.iter();
	let creator = next_account_info(accounts_iter)?;
	let state = next_account_info(accounts_iter)?;
	require_creator(program_id, state, creator)?;
	if state_status(state)? != STATUS_SUBMITTED { return Err(ProgramError::InvalidAccountData) }
	set_bytes(state, 0, &[STATUS_APPROVED])?;
	Ok(())
}

fn process_payout(program_id: &Pubkey, accounts: &[AccountInfo], refund: bool) -> ProgramResult {
	let accounts_iter = &mut accounts.iter();
	let creator = next_account_info(accounts_iter)?;
	let recipient = next_account_info(accounts_iter)?;
	let state = next_account_info(accounts_iter)?;
	let system_program = next_account_info(accounts_iter)?;
	require_creator(program_id, state, creator)?;
	let status = state_status(state)?;
	if (!refund && status != STATUS_APPROVED) || (refund && status != STATUS_FUNDED) { return Err(ProgramError::InvalidAccountData) }
	let data = state.try_borrow_data()?;
	let amount = read_u64(&data, 65)?;
	let worker = Pubkey::new_from_array(data[33..65].try_into().map_err(|_| ProgramError::InvalidAccountData)?);
	if !refund && recipient.key != &worker { return Err(ProgramError::InvalidAccountData) }
	if refund && recipient.key != creator.key { return Err(ProgramError::InvalidAccountData) }
	if !recipient.is_writable || !system_program.key.eq(&solana_program::system_program::id()) { return Err(ProgramError::InvalidAccountData) }
	let summary_hash: [u8; 32] = data[81..113].try_into().map_err(|_| ProgramError::InvalidAccountData)?;
	let (_, bump) = Pubkey::find_program_address(&[b"escrow", creator.key.as_ref(), &summary_hash], program_id);
	let seeds: &[&[u8]] = &[b"escrow", creator.key.as_ref(), &summary_hash, &[bump]];
	invoke_signed(&system_instruction::transfer(state.key, recipient.key, amount), &[state.clone(), recipient.clone(), system_program.clone()], &[seeds])?;
	set_bytes(state, 0, &[if refund { STATUS_REFUNDED } else { STATUS_RELEASED }])?;
	Ok(())
}

fn process_instruction(program_id: &Pubkey, accounts: &[AccountInfo], instruction_data: &[u8]) -> ProgramResult {
	let discriminator = *instruction_data.first().ok_or(ProgramError::InvalidInstructionData)?;
	match discriminator {
		0 => process_init(program_id, accounts, instruction_data),
		1 => process_fund(program_id, accounts, instruction_data),
		2 => process_submit(program_id, accounts, instruction_data),
		3 => process_payout(program_id, accounts, false),
		4 => process_approve(program_id, accounts),
		5 => process_payout(program_id, accounts, true),
		_ => Err(ProgramError::InvalidInstructionData)
	}
}
