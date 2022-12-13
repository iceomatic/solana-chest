use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};

// This is your program's public key and it will update
// automatically when you build the project.
declare_id!("9JsNvQjgaPovfyYy62vcm17HFCczsfBURvnXDQQrHUuB");

#[program]
pub mod solana_chest {
    use super::*;
    pub fn create_chest(ctx: Context<CreateChest>) -> Result<()> {
        let nft_token_account = &ctx.accounts.nft_token_account;
        let nft_mint = &ctx.accounts.nft_mint;
        let user = &ctx.accounts.user;
        let pda = &ctx.accounts.new_account;

        require_eq!(pda.data_is_empty(), true, MyError::AlreadyInitialized);
        require_eq!(nft_token_account.owner, user.key(), MyError::TokenOwnership);
        assert_eq!(nft_token_account.mint, nft_mint.key());
        require_eq!(nft_token_account.amount, 1, MyError::TokenFungible);

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateChest<'info> {
    // We must specify the space in order to initialize an account.
    // First 8 bytes are default account discriminator,
    // (u64 = 64 bits unsigned integer = 8 bytes)
    #[account(init_if_needed, seeds = [b"chest", nft_token_account.mint.as_ref()], bump, payer = user, space = 8)]
    /// CHECK: yeah dude just do it
    pub new_account: AccountInfo<'info>,
    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
    #[account()]
    pub nft_mint: Account<'info, Mint>,
    #[account()]
    pub nft_token_account: Account<'info, TokenAccount>,
}

#[error_code]
pub enum MyError {
    #[msg(Chest already initialized)]
    AlreadyInitialized,
    #[msg(Token not owned by signer)]
    TokenOwnership,
    #[msg(Token should be non-fungible)]
    TokenFungible,
}
