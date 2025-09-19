use anchor_lang::prelude::*;

pub const CANVAS_SIZE_IN_TILES: u8 = 2;
pub const TILE_SIZE_IN_PIXELS: u8 = 32;
pub const COOLDOWN_SECS: u8 = 15;

pub const CANVAS_SEED: &str = "CANVAS_SEED";
pub const TILE_SEED: &str = "TILE_SEED";
pub const USER_STATS_SEED: &str = "USER_STATS_SEED";

#[repr(u8)]
#[derive(AnchorDeserialize, AnchorSerialize, Clone, InitSpace)]
pub enum Colors {
    White,
    Red,
    Orange,
    Amber,
    Yellow,
    Lime,
    Green,
    Emerald,
    Teal,
    Cyan,
    Sky,
    Blue,
    Indigo,
    Violet,
    Purple,
    Fuchsia,
    Pink,
    Rose,
    Slate,
    Gray,
    Zinc,
    Neutral,
    Stone,
}

#[account]
#[derive(InitSpace)]
pub struct Canvas {
    pub width_in_tiles: u8,
    pub height_in_tiles: u8,
    pub tile_width_in_pixels: u8,
    pub tile_height_in_pixels: u8,
    pub cooldown_secs: u8,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Tile {
    pub data: [u8; TILE_SIZE_IN_PIXELS as usize * TILE_SIZE_IN_PIXELS as usize],
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserStats {
    pub last_paint_ts: i64,
    pub paints_total: u32,
    pub bump: u8,
}
