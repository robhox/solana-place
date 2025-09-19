use crate::states::*;

use anchor_lang::prelude::*;

pub fn paint(ctx: Context<PaintContext>, x: u8, y: u8, color: u8) -> Result<()> {
    let tile = &mut ctx.accounts.tile;
    let user_stats = &mut ctx.accounts.user_stats;
    let pixel_position: usize = x as usize % TILE_SIZE_IN_PIXELS as usize
        + (y as usize % TILE_SIZE_IN_PIXELS as usize) * TILE_SIZE_IN_PIXELS as usize;

    tile.data[pixel_position] = color;
    user_stats.paints_total = user_stats.paints_total.checked_add(1).unwrap();
    user_stats.last_paint_ts = Clock::get()?.unix_timestamp;

    Ok(())
}

#[derive(Accounts)]
#[instruction(x: u8, y: u8, color: u8)]
pub struct PaintContext<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        mut,
        seeds = [TILE_SEED.as_bytes(), &[(x - (x % TILE_SIZE_IN_PIXELS))/TILE_SIZE_IN_PIXELS], &[(y - (y % TILE_SIZE_IN_PIXELS))/TILE_SIZE_IN_PIXELS]],
        constraint = (x - (x % TILE_SIZE_IN_PIXELS))/TILE_SIZE_IN_PIXELS < CANVAS_SIZE_IN_TILES && (y - (y % TILE_SIZE_IN_PIXELS))/TILE_SIZE_IN_PIXELS < CANVAS_SIZE_IN_TILES,
        bump
    )]
    pub tile: Account<'info, Tile>,
    #[account(
        mut,
        seeds = [USER_STATS_SEED.as_bytes(), signer.key().as_ref()],
        bump
    )]
    pub user_stats: Account<'info, UserStats>,
    pub system_program: Program<'info, System>,
}
