use crate::instructions::*;
use crate::states::Colors;
use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod states;

declare_id!("5iemUKpH3dMUfxsvduPy5AMkeC8hAm7WGUXdAa958qTK");

#[program]
pub mod splace {
    use super::*;

    pub fn initialize_canvas(ctx: Context<InitializeCanvasContext>) -> Result<()> {
        crate::instructions::initialize_canvas(ctx)
    }
    pub fn initialize_tile(ctx: Context<InitializeTileContext>, x: u8, y: u8) -> Result<()> {
        crate::instructions::initialize_tile(ctx, x, y)
    }
    pub fn initialize_user_stats(ctx: Context<InitializeUserStatsContext>) -> Result<()> {
        crate::instructions::initialize_user_stats(ctx)
    }
    pub fn paint(ctx: Context<PaintContext>, x: u8, y: u8, color: u8) -> Result<()> {
        crate::instructions::paint(ctx, x, y, color)
    }
}
