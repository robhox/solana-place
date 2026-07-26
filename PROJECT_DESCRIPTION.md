# Project Description

**Deployed Frontend URL:** [https://program-robhox.vercel.app/](https://program-robhox.vercel.app/)

**Solana Program ID:** 5iemUKpH3dMUfxsvduPy5AMkeC8hAm7WGUXdAa958qTK

**Deployed on:** Devnet

## Project Overview

### Description
Splace is a decentralized pixel canvas built on Solana. Inspired by community-driven pixel art experiments, this dApp allows users to collectively draw on a shared 2x2 grid (for now) where each pixel can be painted with a chosen color. Every interaction is recorded on-chain, ensuring that the canvas state is transparent, immutable, and verifiable.

The project’s goal is to demonstrate how Solana programs can manage collaborative state, while keeping user interactions fun and visual. Although the current implementation is minimal (a small grid, basic colors), the foundations are ready to scale into larger collaborative art boards.


### Key Features
- **Wallet Connection:** Users connect their Solana wallet to interact with the canvas.
- **Paint Pixels:** Choose coordinates (x, y) and a color index, then send a transaction to update the on-chain state.
- **Real-Time Updates:** The frontend fetches the latest on-chain data to reflect the shared state of the canvas.
- **User Stats Account:** Every pixel painted increments a user's stats account, tracking their contributions and the last time they painted (allows to create a cooldown mechanism later).
- **Program-Derived Accounts (PDAs):** Ensure deterministic and secure storage of pixel data.
- **Lightweight UX:** A simple UI where the canvas is displayed and users can directly click to paint tiles.

### How to Use the dApp
1. **Connect Wallet**
   Click the “Connect Wallet” button and approve the connection with your Solana wallet.

2. **Choose a Color**
   Pick a color index from the available palette.

3. **Select a Pixel**
   Hover over the canvas and click on the pixel you want to paint.

4. **Create a user stats account**
The first time you paint a pixel, you will be prompted to approve the creation of your user stats account with your Solana wallet.

5. **Send Transaction**
   Confirm the transaction in your wallet. The Solana program will update the pixel’s color on-chain.

6. **See the Result**
   Once the transaction is confirmed, the canvas updates to reflect your contribution.

## Program Architecture
[TODO: Describe your Solana program's architecture. Explain the main instructions, account structures, and data flow.]

### PDA Usage
[TODO: Explain how you implemented Program Derived Addresses (PDAs) in your project. What seeds do you use and why?]

**PDAs Used:**
- **Canvas PDA:** Derived using the seed `"CANVAS_SEED"`. This defines the canvas rules such as number of tiles, pixel per tile, and cooldown in seconds.
- **Tile PDA:** Derived using the seed `"TILE_SEED"` + tile coordinates `(x, y)`. This ensures that each tile of the canvas has a unique, predictable address.
- **UserStats PDA:** Derived using the seed `"USER_STATS"` + user’s public key. This keeps track of each user’s contributions.

### Program Instructions
**Instructions Implemented:**
- **initialize_canvas():**
  Creates and initializes a new Canvas PDA if it doesn’t exist yet.
- **initialize_tile(x, y):**
  Creates and initializes a new Tile PDA for the given coordinates if it doesn’t exist yet.
- **initialize_user_stats():**
  Creates and initializes a new UserStats PDA for the given user’s public key if it doesn’t exist yet.
- **paint(x, y, color_index):**
  Updates the pixel at position `(x, y)` with the chosen color index. Requires access to the Tile PDA and the UserStats PDA.

### Account Structure

```rust
#[account]
#[derive(InitSpace)]
pub struct Canvas {
    pub width_in_tiles: u8, // Width of the canvas in tiles
    pub height_in_tiles: u8, // Height of the canvas in tiles
    pub tile_width_in_pixels: u8, // Width of each tile in pixels
    pub tile_height_in_pixels: u8, // Height of each tile in pixels
    pub cooldown_secs: u8, // Cooldown in seconds between paint operations
    pub bump: u8, // Bump counter for PDA derivation
}

#[account]
#[derive(InitSpace)]
pub struct Tile {
    pub data: [u8; TILE_SIZE_IN_PIXELS as usize * TILE_SIZE_IN_PIXELS as usize], // Pixel data for the tile
    pub bump: u8, // Bump counter for PDA derivation
}

#[account]
#[derive(InitSpace)]
pub struct UserStats {
    pub last_paint_ts: i64, // Timestamp of the last paint operation
    pub paints_total: u32, // Total number of paint operations
    pub bump: u8, // Bump counter for PDA derivation
}
```

## Testing

### Test Coverage
They cover initialization flows (canvas, tiles, user stats), pixel painting across tile boundaries, PDA derivation, and error handling for duplicate creates and out-of-bounds writes.
Helpers validate on-chain account data: `checkCanvas`, `checkTile`, `checkPixelColor`, and `checkUserStats`. An `airdrop` helper funds test signers.

Environment constants under test
* `CANVAS_SIZE_IN_TILES = 2`
* `TILE_SIZE_IN_PIXELS = 32`
* `COOLDOWN_SECS = 15`
* Seeds: `"CANVAS_SEED"`, `"TILE_SEED"`, `"USER_STATS_SEED"`

**Happy Path Tests:**

* **Initialize Canvas (first time)**
  * Airdrops to a signer, derives the Canvas PDA, calls `initializeCanvas`, and verifies:
    * `widthInTiles == 2`, `heightInTiles == 2`
    * `tileWidthInPixels == 32`, `tileHeightInPixels == 32`
    * `cooldownSecs == 15`
    * PDA `bump` matches the derived one.

* **Initialize Tile (0,0)**
  * Derives Tile PDA for `(x=0, y=0)`, calls `initializeTile`, then asserts:
    * `data.length == 32 * 32`
    * All pixel entries are `0`
    * PDA `bump` matches.

* **Initialize Another Tile (1,1)**
  * Same as above, but for `(x=1, y=1)`; verifies an independent, zero-initialized tile.

* **Initialize User Stats**
  * Derives `UserStats` PDA for `bob`, calls `initializeUserStats`, asserts:
    * `lastPaintTs == 0` (not set yet)
    * `paintsTotal == 0`
    * PDA `bump` matches.

* **Paint Pixel In-Bounds (within same tile)**
  * Chooses `(pixel_x=10, pixel_y=10)`, color `1`, derives Tile + UserStats PDAs, calls `paint`, then asserts:
    * The target pixel index is updated to `1` in the tile’s `data`.
    * `UserStats.lastPaintTs > 0`
    * `UserStats.paintsTotal == 1`.

* **Paint Pixel In Another Tile (crossing tile boundary)**
  * Uses `(pixel_x=32, pixel_y=32)` (boundary → tile `(1,1)`), color `1`, calls `paint`, then asserts:
    * Pixel is updated to `1` in the correct tile.
    * `UserStats.paintsTotal == 2` (incremented).

**Unhappy Path Tests:**
* **Canvas Cannot Be Initialized Twice**

  * Calls `initializeCanvas` again with the same PDA; expects logs to include **"already in use"** and the test to fail the second time.

* **Tile Cannot Be Initialized Twice**

  * Re-calls `initializeTile` for `(0,0)` with the same Tile PDA; expects **"already in use"**.

* **Tile Out of Bounds Cannot Be Initialized**

  * Attempts to derive a tile PDA using coordinates equal to `CANVAS_SIZE_IN_TILES` (i.e., out of bounds) and call `initializeTile`; expects seed constraint failure message **"A seeds constraint was violated"**.

* **Pixel Out of Bounds Cannot Be Painted**

  * Uses `(pixel_x=64, pixel_y=64)` which is outside a `2 * 32` canvas. Attempts `paint`; expects account init/availability error **"The program expected this account to be already initialized"**.
  * Confirms `UserStats.paintsTotal` remains at `2` (unchanged by the failed tx).


### Running Tests
```bash
# Commands to run your tests
anchor test
```

### Additional Notes for Evaluators

- The project is deliberately minimal (2x2 grid) to keep things simple and demonstrate the mechanics of on-chain collaborative drawing.

- The architecture is designed to scale: more tiles can be added, color palettes expanded, and game-like rules implemented (cooldowns, limits per user, etc.).
