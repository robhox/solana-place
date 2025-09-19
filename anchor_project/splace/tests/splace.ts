import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Splace } from "../target/types/splace";
import { PublicKey } from "@solana/web3.js";
import { assert } from "chai";

const CANVAS_SIZE_IN_TILES = 2;
const TILE_SIZE_IN_PIXELS = 32;
const COOLDOWN_SECS = 15;

const CANVAS_SEED = "CANVAS_SEED";
const TILE_SEED = "TILE_SEED";
const USER_STATS_SEED = "USER_STATS_SEED";

describe("splace", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.splace as Program<Splace>;

  const bob = anchor.web3.Keypair.generate();

  describe("Initialize Canvas", async () => {
    it("Should successfully initialize the canvas", async () => {
      await airdrop(provider.connection, bob.publicKey);
      const [canvas_pkey, canvas_bump] = getCanvasAddress(program.programId);

      await program.methods
        .initializeCanvas()
        .accounts({
          signer: bob.publicKey,
          canvas: canvas_pkey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bob])
        .rpc({ commitment: "confirmed" });

      await checkCanvas(
        program,
        canvas_pkey,
        CANVAS_SIZE_IN_TILES,
        CANVAS_SIZE_IN_TILES,
        TILE_SIZE_IN_PIXELS,
        TILE_SIZE_IN_PIXELS,
        COOLDOWN_SECS,
        canvas_bump
      );
    });

    it("Canvas cannot be initialized multiple times", async () => {
      const [canvas_pkey, canvas_bump] = getCanvasAddress(program.programId);
      let should_fail = "This Should Fail";
      try {
        await program.methods
          .initializeCanvas()
          .accounts({
            signer: bob.publicKey,
            canvas: canvas_pkey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([bob])
          .rpc({ commitment: "confirmed" });
      } catch (error) {
        should_fail = "Failed";
        assert.isTrue(
          SolanaError.contains(error.logs, "already in use"),
          "Expected 'already in use' error for the second canvas initialization"
        );
      }

      assert.strictEqual(
        should_fail,
        "Failed",
        "Canvas initialization should have failed when trying to initialize it a second time"
      );
    });
  });

  describe("Initialize Tiles", async () => {
    const tile_x = 0;
    const tile_y = 0;

    const another_tile_x = 1;
    const another_tile_y = 1;

    it("Should successfully initialize a tile in bounds", async () => {
      await airdrop(provider.connection, bob.publicKey);
      const [tile_pkey, tile_bump] = getTileAddress(
        program.programId,
        tile_x,
        tile_y
      );

      await program.methods
        .initializeTile(tile_x, tile_y)
        .accounts({
          signer: bob.publicKey,
          tile: tile_pkey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bob])
        .rpc({ commitment: "confirmed" });

      await checkTile(
        program,
        tile_pkey,
        new Array(TILE_SIZE_IN_PIXELS * TILE_SIZE_IN_PIXELS).fill(0),
        tile_bump
      );
    });

    it("Should successfully initialize another tile in bounds", async () => {
      await airdrop(provider.connection, bob.publicKey);
      const [tile_pkey, tile_bump] = getTileAddress(
        program.programId,
        another_tile_x,
        another_tile_y
      );

      await program.methods
        .initializeTile(another_tile_x, another_tile_y)
        .accounts({
          signer: bob.publicKey,
          tile: tile_pkey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bob])
        .rpc({ commitment: "confirmed" });

      await checkTile(
        program,
        tile_pkey,
        new Array(TILE_SIZE_IN_PIXELS * TILE_SIZE_IN_PIXELS).fill(0),
        tile_bump
      );
    });

    it("Tile cannot be initialized multiple times", async () => {
      const [tile_pkey, tile_bump] = getTileAddress(
        program.programId,
        tile_x,
        tile_y
      );
      let should_fail = "This Should Fail";
      try {
        await program.methods
          .initializeTile(tile_x, tile_y)
          .accounts({
            signer: bob.publicKey,
            tile: tile_pkey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([bob])
          .rpc({ commitment: "confirmed" });
      } catch (error) {
        should_fail = "Failed";
        assert.isTrue(
          SolanaError.contains(error.logs, "already in use"),
          "Expected 'already in use' error for the second canvas initialization"
        );
      }

      assert.strictEqual(
        should_fail,
        "Failed",
        "Canvas initialization should have failed when trying to initialize it a second time"
      );
    });

    it("Tile out of bounds cannot be initialized", async () => {
      const tile_x_out_of_bounds = CANVAS_SIZE_IN_TILES;
      const tile_y_out_of_bounds = CANVAS_SIZE_IN_TILES;
      const [tile_pkey, tile_bump] = getTileAddress(
        program.programId,
        tile_x_out_of_bounds,
        tile_y_out_of_bounds
      );
      let should_fail = "This Should Fail";
      try {
        await program.methods
          .initializeTile(tile_x_out_of_bounds, tile_y_out_of_bounds)
          .accounts({
            signer: bob.publicKey,
            tile: tile_pkey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([bob])
          .rpc({ commitment: "confirmed" });
      } catch (error) {
        should_fail = "Failed";
        assert.isTrue(
          SolanaError.contains(error.logs, "A seeds constraint was violated"),
          "Expected 'A seeds constraint was violated' error for the second canvas initialization"
        );
      }

      assert.strictEqual(
        should_fail,
        "Failed",
        "Tile initialization should have failed when trying to initialize it out of bounds"
      );
    });
  });

  describe("Initialize User Stats", async () => {
    it("Should successfully initialize the user stats", async () => {
      await airdrop(provider.connection, bob.publicKey);
      const [user_stats_pkey, user_stats_bump] = getUserStatsAddress(
        program.programId,
        bob.publicKey
      );

      await program.methods
        .initializeUserStats()
        .accounts({
          signer: bob.publicKey,
          userStats: user_stats_pkey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bob])
        .rpc({ commitment: "confirmed" });

      await checkUserStats(program, user_stats_pkey, false, 0, user_stats_bump);
    });

    it("A user stats account cannot be initialized multiple times", async () => {
      const [user_stats_pkey, user_stats_bump] = getUserStatsAddress(
        program.programId,
        bob.publicKey
      );
      let should_fail = "This Should Fail";
      try {
        await program.methods
          .initializeUserStats()
          .accounts({
            signer: bob.publicKey,
            userStats: user_stats_pkey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([bob])
          .rpc({ commitment: "confirmed" });
      } catch (error) {
        should_fail = "Failed";
        assert.isTrue(
          SolanaError.contains(error.logs, "already in use"),
          "Expected 'already in use' error for the second UserStats initialization"
        );
      }

      assert.strictEqual(
        should_fail,
        "Failed",
        "UserStats initialization should have failed when trying to initialize it a second time"
      );
    });
  });

  describe("Paint", async () => {
    it("Should successfully paint pixel in bounds", async () => {
      await airdrop(provider.connection, bob.publicKey);
      const pixel_x = 10;
      const pixel_y = 10;
      const color = 1;

      const [tile_x, tile_y] = getTileForPixels(pixel_x, pixel_y);
      const [tile_pkey, tile_bump] = getTileAddress(
        program.programId,
        tile_x,
        tile_y
      );

      const [user_stats_pkey, user_stats_bump] = getUserStatsAddress(
        program.programId,
        bob.publicKey
      );

      try {
        await program.methods
          .paint(pixel_x, pixel_y, color)
          .accounts({
            signer: bob.publicKey,
            tile: tile_pkey,
            userStats: user_stats_pkey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([bob])
          .rpc({ commitment: "confirmed" });
      } catch (error) {
        console.error(error);
      }

      await checkPixelColor(program, pixel_x, pixel_y, color);
      await checkUserStats(program, user_stats_pkey, true, 1, user_stats_bump);
    });

    it("Should successfully paint pixel in another tile", async () => {
      const pixel_x = TILE_SIZE_IN_PIXELS;
      const pixel_y = TILE_SIZE_IN_PIXELS;
      const color = 1;

      const [tile_x, tile_y] = getTileForPixels(pixel_x, pixel_y);
      const [tile_pkey, tile_bump] = getTileAddress(
        program.programId,
        tile_x,
        tile_y
      );

      const [user_stats_pkey, user_stats_bump] = getUserStatsAddress(
        program.programId,
        bob.publicKey
      );

      await program.methods
        .paint(pixel_x, pixel_y, color)
        .accounts({
          signer: bob.publicKey,
          tile: tile_pkey,
          userStats: user_stats_pkey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bob])
        .rpc({ commitment: "confirmed" });

      await checkPixelColor(program, pixel_x, pixel_y, color);
      await checkUserStats(program, user_stats_pkey, true, 2, user_stats_bump);
    });

    it("Pixel out of bounds cannot be painted", async () => {
      const pixel_x_out_of_bounds = TILE_SIZE_IN_PIXELS * CANVAS_SIZE_IN_TILES;
      const pixel_y_out_of_bounds = TILE_SIZE_IN_PIXELS * CANVAS_SIZE_IN_TILES;
      const color = 1;

      const [tile_x, tile_y] = getTileForPixels(
        pixel_x_out_of_bounds,
        pixel_y_out_of_bounds
      );
      const [tile_pkey, tile_bump] = getTileAddress(
        program.programId,
        tile_x,
        tile_y
      );

      const [user_stats_pkey, user_stats_bump] = getUserStatsAddress(
        program.programId,
        bob.publicKey
      );
      let should_fail = "This Should Fail";
      try {
        await program.methods
          .paint(pixel_x_out_of_bounds, pixel_y_out_of_bounds, color)
          .accounts({
            signer: bob.publicKey,
            tile: tile_pkey,
            userStats: user_stats_pkey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([bob])
          .rpc({ commitment: "confirmed" });
      } catch (error) {
        should_fail = "Failed";
        assert.isTrue(
          SolanaError.contains(
            error.logs,
            "The program expected this account to be already initialized"
          ),
          "Expected 'The program expected this account to be already initialized' error for the second canvas initialization"
        );
      }

      assert.strictEqual(
        should_fail,
        "Failed",
        "Tile initialization should have failed when trying to initialize it out of bounds"
      );
      await checkUserStats(program, user_stats_pkey, true, 2, user_stats_bump);
    });
  });
});

async function airdrop(connection: any, address: any, amount = 1000000000) {
  await connection.confirmTransaction(
    await connection.requestAirdrop(address, amount),
    "confirmed"
  );
}

function getCanvasAddress(programID: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [anchor.utils.bytes.utf8.encode(CANVAS_SEED)],
    programID
  );
}

function getTileAddress(programID: PublicKey, x: number, y: number) {
  return PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode(TILE_SEED),
      Buffer.from([x]),
      Buffer.from([y]),
    ],
    programID
  );
}

function getTileForPixels(pixel_x: number, pixel_y: number) {
  const tile_x =
    (pixel_x - (pixel_x % TILE_SIZE_IN_PIXELS)) / TILE_SIZE_IN_PIXELS;
  const tile_y =
    (pixel_y - (pixel_y % TILE_SIZE_IN_PIXELS)) / TILE_SIZE_IN_PIXELS;
  return [tile_x, tile_y];
}

function getUserStatsAddress(programID: PublicKey, user: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [anchor.utils.bytes.utf8.encode(USER_STATS_SEED), user.toBuffer()],
    programID
  );
}

class SolanaError {
  static contains(logs, error): boolean {
    const match = logs?.filter((s) => s.includes(error));
    return Boolean(match?.length);
  }
}

async function checkCanvas(
  program: anchor.Program<Splace>,
  canvas: PublicKey,
  width_in_tiles?: number,
  height_in_tiles?: number,
  tile_width_in_pixels?: number,
  tile_height_in_pixels?: number,
  cooldown_secs?: number,
  bump?: number
) {
  let canvasData = await program.account.canvas.fetch(canvas);

  if (width_in_tiles) {
    assert.strictEqual(
      canvasData.widthInTiles,
      CANVAS_SIZE_IN_TILES,
      `Canvas widthInTiles should be ${canvasData.widthInTiles} but was ${CANVAS_SIZE_IN_TILES}`
    );
  }
  if (height_in_tiles) {
    assert.strictEqual(
      canvasData.heightInTiles,
      CANVAS_SIZE_IN_TILES,
      `Canvas heightInTiles should be ${canvasData.heightInTiles} but was ${CANVAS_SIZE_IN_TILES}`
    );
  }
  if (tile_width_in_pixels) {
    assert.strictEqual(
      canvasData.tileWidthInPixels,
      TILE_SIZE_IN_PIXELS,
      `Canvas tileWidthInPixels should be "${canvasData.tileWidthInPixels}" but was "${TILE_SIZE_IN_PIXELS}"`
    );
  }
  if (tile_height_in_pixels) {
    assert.strictEqual(
      canvasData.tileHeightInPixels,
      TILE_SIZE_IN_PIXELS,
      `Canvas tileHeightInPixels should be "${canvasData.tileHeightInPixels}" but was "${TILE_SIZE_IN_PIXELS}"`
    );
  }
  if (cooldown_secs) {
    assert.strictEqual(
      canvasData.cooldownSecs,
      COOLDOWN_SECS,
      `Canvas cooldownSecs should be "${canvasData.cooldownSecs}" but was "${COOLDOWN_SECS}"`
    );
  }
  if (bump) {
    assert.strictEqual(
      canvasData.bump.toString(),
      bump.toString(),
      `Canvas bump should be ${canvasData.bump} but was ${bump}`
    );
  }
}

async function checkTile(
  program: anchor.Program<Splace>,
  tile: PublicKey,
  data: number[],
  bump?: number
) {
  let tileData = await program.account.tile.fetch(tile);
  if (data) {
    assert.strictEqual(
      tileData.data.length,
      data.length,
      `Tile Data length mismatch: got ${tileData.data.length}, expected ${data.length}`
    );
    assert.deepStrictEqual(
      tileData.data,
      data,
      `Tile Data mismatch: got ${tileData.data}, expected ${data}`
    );
  }
  if (bump) {
    assert.strictEqual(
      tileData.bump.toString(),
      bump.toString(),
      `Tile bump should be ${tileData.bump} but was ${bump}`
    );
  }
}

async function checkPixelColor(
  program: anchor.Program<Splace>,
  pixel_x?: number,
  pixel_y?: number,
  color?: number
) {
  let [tile_x, tile_y] = getTileForPixels(pixel_x, pixel_y);
  let [tile, tile_bump] = getTileAddress(program.programId, tile_x, tile_y);
  let tileData = await program.account.tile.fetch(tile);
  if (pixel_x && pixel_y && color) {
    assert.strictEqual(
      tileData.data[
        (pixel_x % TILE_SIZE_IN_PIXELS) +
          (pixel_y % TILE_SIZE_IN_PIXELS) * TILE_SIZE_IN_PIXELS
      ],
      color,
      `Pixel color mismatch: got ${
        tileData.data[pixel_x + pixel_y * TILE_SIZE_IN_PIXELS]
      }, expected ${color}`
    );
  }
}

async function checkUserStats(
  program: anchor.Program<Splace>,
  userStats: PublicKey,
  check_last_paint_ts: boolean,
  paints_total: number,
  bump?: number
) {
  let userStatsData = await program.account.userStats.fetch(userStats);
  if (check_last_paint_ts) {
    assert.isAbove(
      userStatsData.lastPaintTs.toNumber(),
      0,
      `Last paint timestamp mismatch: got ${userStatsData.lastPaintTs}, expected it to be more than 0`
    );
  }
  if (paints_total) {
    assert.strictEqual(
      userStatsData.paintsTotal,
      paints_total,
      `Paints total mismatch: got ${userStatsData.paintsTotal}, expected ${paints_total}`
    );
  }
  if (bump) {
    assert.strictEqual(
      userStatsData.bump.toString(),
      bump.toString(),
      `UserStas bump should be ${userStatsData.bump} but was ${bump}`
    );
  }
}
