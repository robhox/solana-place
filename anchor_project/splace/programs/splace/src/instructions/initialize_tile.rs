use crate::states::*;

use anchor_lang::prelude::*;

pub fn initialize_tile(ctx: Context<InitializeTileContext>, _x: u8, _y: u8) -> Result<()> {
    ctx.accounts.tile.data =
        [Colors::White as u8; (TILE_SIZE_IN_PIXELS as usize * TILE_SIZE_IN_PIXELS as usize)];
    ctx.accounts.tile.bump = ctx.bumps.tile;
    Ok(())
}

#[derive(Accounts)]
#[instruction(x: u8, y: u8)]
pub struct InitializeTileContext<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init,
        payer = signer,
        space = 8 + Tile::INIT_SPACE,
        seeds = [TILE_SEED.as_bytes(), &[x], &[y]],
        constraint =
            x < CANVAS_SIZE_IN_TILES && y < CANVAS_SIZE_IN_TILES,
        bump
    )]
    pub tile: Account<'info, Tile>,
    pub system_program: Program<'info, System>,
}
