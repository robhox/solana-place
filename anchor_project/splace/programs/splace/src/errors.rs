use anchor_lang::prelude::*;

#[error_code]
pub enum SplaceError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Pixel out of bounds")]
    OutOfBounds,
    #[msg("Cooldown not elapsed")]
    CooldownNotElapsed,
    #[msg("Color does not exist")]
    ColorDoesNotExist,
}
