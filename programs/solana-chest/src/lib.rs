use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use anchor_spl::associated_token::{self, AssociatedToken, Create};

// This is your program's public key and it will update
// automatically when you build the project.
declare_id!("9JsNvQjgaPovfyYy62vcm17HFCczsfBURvnXDQQrHUuB");

#[program]
mod solana_chest {
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

    pub fn create_ata(ctx: Context<CreateATA>) -> Result<()> {
        let cpi_accounts = Create {
            payer: ctx.accounts.payer.to_account_info(),
            associated_token: ctx.accounts.new_token_account.to_account_info(),
            authority: ctx.accounts.chest_pda.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        };

        let cpi_program = ctx.accounts.associated_token_program.to_account_info();

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        associated_token::create(cpi_ctx)
    }
}


#[derive(Accounts)]
pub struct CreateChest<'info> {
    // We must specify the space in order to initialize an account.
    // First 8 bytes are default account discriminator,
    // (u64 = 64 bits unsigned integer = 8 bytes)
    #[account(init, seeds = [b"chest", nft_token_account.mint.as_ref()], bump, payer = user, space=8+8)]
    pub new_account: Account<'info, ChestPda>,

    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    #[account()]
    pub nft_mint: Account<'info, Mint>,
    #[account()]
    pub nft_token_account: Account<'info, TokenAccount>,


}

#[derive(Accounts)]
pub struct CreateATA<'info> {

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    ///CHECK maybe
    pub new_token_account: UncheckedAccount<'info>,
    

    pub chest_pda: Account<'info,ChestPda>,
    pub mint: Account<'info, Mint>, // Mint addy of token
    pub token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
pub struct ChestPda {
}

#[error_code]
pub enum MyError {
    #[msg(Chest already initialized)]
    AlreadyInitialized,
    #[msg(Token not owned by signer)]
    TokenOwnership,
    #[msg(Token should be non-fungible)]
    TokenFungible
}

