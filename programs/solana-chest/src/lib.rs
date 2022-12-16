use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use anchor_spl::associated_token::{self, AssociatedToken, Create};

// This is your program's public key and it will update
// automatically when you build the project.
declare_id!("CKBZ7U5CWFnUohedMMRhSiK1xzEbcC3j6G9dxsbqmtJW");

#[program]
mod solana_chest {
    use anchor_spl::token::Transfer;

    use super::*;
    pub fn create_chest(ctx: Context<CreateChest>, bump: u8) -> Result<()> {
        let nft_token_account = &ctx.accounts.nft_token_account;
        let nft_mint = &ctx.accounts.nft_mint;
        let user = &ctx.accounts.user;
        
        require_eq!(nft_token_account.owner, user.key(), MyError::TokenOwnership);
        assert_eq!(nft_token_account.mint, nft_mint.key());
        require_eq!(nft_token_account.amount, 1, MyError::TokenFungible);
        
        ctx.accounts.new_account.bump = bump;

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
    pub fn withdraw_token(ctx: Context<WithdrawToken>) -> Result<()> {
        let transfer_account_info = Transfer {
            from: ctx.accounts.from_token_account.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: ctx.accounts.from_account.to_account_info()
        };
        let seeds = &[
            b"chest",
            ctx.accounts.from_token_account.mint.as_ref(),
            &[ctx.accounts.from_account.bump]
        ];
        let signer_seeds = &[&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), transfer_account_info, signer_seeds);
        anchor_spl::token::transfer(cpi_ctx, 1)
    }
}


#[derive(Accounts)]
pub struct CreateChest<'info> {
    // We must specify the space in order to initialize an account.
    // First 8 bytes are default account discriminator,
    // (u64 = 64 bits unsigned integer = 8 bytes)
    #[account(init, seeds = [b"chest", nft_token_account.mint.as_ref()], bump, payer = user, space=8+1)]
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
    pub rent: Sysvar<'info, Rent>
}

#[derive(Accounts)]
pub struct WithdrawToken<'info> {
    #[account(mut, seeds=[b"chest",chest_key.mint.as_ref()], bump)]
    from_account: Account<'info, ChestPda>,

    #[account(mut, token::mint = token_mint)]
    from_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = signer,
        associated_token::mint = token_mint,
        associated_token::authority = signer,
    )]
    pub to: Account<'info, TokenAccount>,

    #[account()]
    pub token_mint: Account<'info, Mint>,

    #[account(owner = signer.key())]
    pub chest_key: Account<'info, TokenAccount>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>
}

#[account]
pub struct ChestPda {
    bump: u8
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

