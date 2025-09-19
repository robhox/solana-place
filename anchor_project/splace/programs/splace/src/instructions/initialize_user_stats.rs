use crate::states::*;

use anchor_lang::prelude::*;

pub fn initialize_user_stats(ctx: Context<InitializeUserStatsContext>) -> Result<()> {
    ctx.accounts.user_stats.last_paint_ts = 0;
    ctx.accounts.user_stats.paints_total = 0;
    ctx.accounts.user_stats.bump = ctx.bumps.user_stats;
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeUserStatsContext<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init,
        payer = signer,
        space = 8 + UserStats::INIT_SPACE,
        seeds = [USER_STATS_SEED.as_bytes(), signer.key().as_ref()],
        bump
    )]
    pub user_stats: Account<'info, UserStats>,
    pub system_program: Program<'info, System>,
}
