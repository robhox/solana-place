import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import idl from "../anchor_project/splace/target/idl/splace.json";

const PROGRAM_ID = new PublicKey(
  "5iemUKpH3dMUfxsvduPy5AMkeC8hAm7WGUXdAa958qTK",
);
const TILE_SEED = "TILE_SEED";
const x = 1;
const y = 1;

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = new anchor.Program(idl, provider);
  const [tilePda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(TILE_SEED), Buffer.from([x]), Buffer.from([y])],
    PROGRAM_ID,
  );

  console.log("Tile PDA:", tilePda.toBase58(), " bump:", bump);

  const signature = await program.methods
    .initializeTile(x, y)
    .accounts({
      tile: tilePda,
      signer: provider.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Tx:", signature);
  console.log(
    `Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
