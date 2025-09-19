use crate::states::*;

use anchor_lang::prelude::*;

pub fn initialize_canvas(ctx: Context<InitializeCanvasContext>) -> Result<()> {
    ctx.accounts.canvas.width_in_tiles = CANVAS_SIZE_IN_TILES;
    ctx.accounts.canvas.height_in_tiles = CANVAS_SIZE_IN_TILES;
    ctx.accounts.canvas.tile_width_in_pixels = TILE_SIZE_IN_PIXELS;
    ctx.accounts.canvas.tile_height_in_pixels = TILE_SIZE_IN_PIXELS;
    ctx.accounts.canvas.cooldown_secs = COOLDOWN_SECS;
    ctx.accounts.canvas.bump = ctx.bumps.canvas;
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeCanvasContext<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init,
        payer = signer,
        space = 8 + Canvas::INIT_SPACE,
        seeds = [CANVAS_SEED.as_bytes()],
        bump
    )]
    pub canvas: Account<'info, Canvas>,
    pub system_program: Program<'info, System>,
}
