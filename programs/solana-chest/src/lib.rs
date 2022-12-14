use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

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

        require_eq!(nft_token_account.owner, user.key(), MyError::TokenOwnership);
        assert_eq!(nft_token_account.mint, nft_mint.key());
        require_eq!(nft_token_account.amount, 1, MyError::TokenFungible);

        Ok(())
    }

    pub fn put_into_chest(ctx: Context<PutIntoChest>) -> Result<()> {
        let sender: &Signer = &ctx.accounts.sender; // Human Controlled Account
        let chest: &Account<TokenAccount> = &ctx.accounts.chest; // this is the NFT that is a chest: 'owns' other NFTs
        let chest_pda = &ctx.accounts.chest_pda; // PDA derived from this smart contract and Human Controlled Account. Just an implementation detail to sign txs TODO: anchor constraint to ensure it derives from chest
        let thing_associated_account: &Account<TokenAccount> =
            &ctx.accounts.thing_associated_account; // an associated token account created to hold the 'thing' under chest_pda.

        anchor_spl::token::transfer(
            CpiContext::new(
                // a human signs this so we use new() instead of new_with_signer()
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: sender.to_account_info(), // user must already own the NFTs, TODO: anchor constraint
                    to: chest_pda.to_account_info(),
                    authority: sender.to_account_info(),
                },
            ),
            1,
        )
    }
}

#[derive(Accounts)]
pub struct CreateChest<'info> {
    // We must specify the space in order to initialize an account.
    // First 8 bytes are default account discriminator,
    // (u64 = 64 bits unsigned integer = 8 bytes)
    #[account(init, seeds = [b"chest", nft_token_account.mint.as_ref()], bump, payer = user, space = 8)]
    pub new_account: Account<'info, ChestPDA>,
    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
    #[account()]
    pub nft_mint: Account<'info, Mint>,
    #[account()]
    pub nft_token_account: Account<'info, TokenAccount>,
}

#[derive(Accounts)]
pub struct PutIntoChest<'info> {
    #[account(mut)]
    pub sender: Signer<'info>, // HUMAN CONTROLLED ACCOUNT
    #[account(mut)]
    pub chest: Account<'info, TokenAccount>, // The NFT that was converted into a Chest. SPL NFT derived from SENDER and NFT_MINT
    #[account(mut)]
    pub chest_pda: Account<'info, ChestPDA>, // the PDA that can sign for the 'thing' to be transferred elsewhere

    #[account(init_if_needed, payer = sender, associated_token::mint = mint, associated_token::authority = sender)]
    pub thing_associated_account: Account<'info, TokenAccount>, // derived from chest_pda and the thing's NFT mint

    pub mint: Account<'info, Mint>, // Mint of transfered NFT

    #[account(address = SYSTEM_PROGRAM_ID)]
    pub system_program: Program<'info, System>,
    #[account(address = TOKEN_PROGRAM_ID)]
    pub token_program: Program<'info, Token>,
    #[account(address = ASSOCIATED_TOKEN_PROGRAM_ID)]
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}
#[account]
pub struct ChestPDA {}

#[error_code]
pub enum MyError {
    #[msg(Chest already initialized)]
    AlreadyInitialized,
    #[msg(Token not owned by signer)]
    TokenOwnership,
    #[msg(Token should be non-fungible)]
    TokenFungible,
}
