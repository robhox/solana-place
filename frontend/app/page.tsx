"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Github, Loader2, MousePointer2, Wallet } from "lucide-react";
import { Connection, ComputeBudgetProgram, Transaction } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import splaceIdl from "./../public/splace.json";
import { toast } from "sonner";
import { getConnection } from "@/lib/solana";
import { confirmWithHttpPolling } from "@/lib/utils";

const TILE_SIZE = 32;
const TILES_PER_SIDE = 2;
const CANVAS_SIZE = TILE_SIZE * TILES_PER_SIDE;
const RENDER_SCALE = 8;
const PROGRAM_ID: string =
  splaceIdl.address ?? "5iemUKpH3dMUfxsvduPy5AMkeC8hAm7WGUXdAa958qTK";
const TILE_SEED = "TILE_SEED";
const USER_STATS_SEED = "USER_STATS_SEED";

const TAILWIND_500 = [
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
];

const WHITE = ["white"];

type NamedColor = (typeof TAILWIND_500)[number] | (typeof WHITE)[number];

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selected, setSelected] = useState<NamedColor>("blue");
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [isSigningTransaction, setIsSigningTransaction] =
    useState<boolean>(false);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hovered, setHovered] = useState<{ x: number; y: number } | null>(null);

  const framebuffer = useRef<number[]>(
    Array(CANVAS_SIZE * CANVAS_SIZE).fill(0),
  );

  const cssColors = useMemo(() => {
    const base: Record<NamedColor, string> = {
      white: "#ffffff",
      red: "#ef4444",
      orange: "#f97316",
      amber: "#f59e0b",
      yellow: "#eab308",
      lime: "#84cc16",
      green: "#22c55e",
      emerald: "#10b981",
      teal: "#14b8a6",
      cyan: "#06b6d4",
      sky: "#0ea5e9",
      blue: "#3b82f6",
      indigo: "#6366f1",
      violet: "#8b5cf6",
      purple: "#a855f7",
      fuchsia: "#d946ef",
      pink: "#ec4899",
      rose: "#f43f5e",
      slate: "#64748b",
      gray: "#6b7280",
      zinc: "#71717a",
      neutral: "#737373",
      stone: "#78716c",
    };
    const list = [...WHITE, ...TAILWIND_500] as NamedColor[];
    return list.map((name) => base[name]);
  }, []);

  const palette: NamedColor[] = useMemo(() => ["white", ...TAILWIND_500], []);

  const ONCHAIN_COLOR_INDEX: Record<NamedColor, number> = {
    white: 0,
    red: 1,
    orange: 2,
    amber: 3,
    yellow: 4,
    lime: 5,
    green: 6,
    emerald: 7,
    teal: 8,
    cyan: 9,
    sky: 10,
    blue: 11,
    indigo: 12,
    violet: 13,
    purple: 14,
    fuchsia: 15,
    pink: 16,
    rose: 17,
    slate: 18,
    gray: 19,
    zinc: 20,
    neutral: 21,
    stone: 22,
  };

  const colorIndex = (name: NamedColor) => palette.indexOf(name);
  const redraw = () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, cvs.width, cvs.height);

    const fb = framebuffer.current;
    for (let y = 0; y < CANVAS_SIZE; y++) {
      for (let x = 0; x < CANVAS_SIZE; x++) {
        const idx = y * CANVAS_SIZE + x;
        const colorIdx = fb[idx] ?? 0;
        ctx.fillStyle = cssColors[colorIdx] || "#ffffff";
        ctx.fillRect(
          x * RENDER_SCALE,
          y * RENDER_SCALE,
          RENDER_SCALE,
          RENDER_SCALE,
        );
      }
    }

    if (hovered) {
      ctx.strokeStyle = "black";
      ctx.strokeRect(
        hovered.x * RENDER_SCALE,
        hovered.y * RENDER_SCALE,
        RENDER_SCALE,
        RENDER_SCALE,
      );
    }

    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    for (let i = 1; i < TILES_PER_SIDE; i++) {
      const pos = i * TILE_SIZE * RENDER_SCALE;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, CANVAS_SIZE * RENDER_SCALE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(CANVAS_SIZE * RENDER_SCALE, pos);
      ctx.stroke();
    }
  };

  useEffect(() => {
    if (!walletConnected || isSigningTransaction) return;
    redraw();
    // Hover redraws are intentionally isolated from connection-state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hovered]);

  useEffect(() => {
    console.log(
      "Ce code ne s'exécute qu'une seule fois au chargement de la page",
    );
    setConnection(getConnection());
    const cvs = canvasRef.current;
    if (!cvs) return;
    cvs.width = CANVAS_SIZE * RENDER_SCALE;
    cvs.height = CANVAS_SIZE * RENDER_SCALE;
    redraw();
    // Canvas dimensions and the RPC connection are initialized once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(
      ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE,
    );
    const y = Math.floor(
      ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE,
    );
    if (x < 0 || y < 0 || x >= CANVAS_SIZE || y >= CANVAS_SIZE) {
      setHovered(null);
    } else {
      setHovered({ x, y });
    }
  };

  const loadTile = async (tileX: number, tileY: number) => {
    const programPk = new anchor.web3.PublicKey(PROGRAM_ID);

    const [tilePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(TILE_SEED), Buffer.from([tileX]), Buffer.from([tileY])],

      programPk,
    );

    let info;
    try {
      info = await connection?.getAccountInfo(tilePda);
    } catch {
      toast.error("Error loading tile");
      return;
    }
    if (!info) return;
    const coder = new anchor.BorshAccountsCoder(splaceIdl as anchor.Idl);
    const tile: { data: Uint8Array } = coder.decode("Tile", info.data);
    const data: Uint8Array = tile.data;

    for (let ly = 0; ly < TILE_SIZE; ly++) {
      for (let lx = 0; lx < TILE_SIZE; lx++) {
        const colorIdx = data[ly * TILE_SIZE + lx] ?? 0;
        const gx = tileX * TILE_SIZE + lx;
        const gy = tileY * TILE_SIZE + ly;
        framebuffer.current[gy * CANVAS_SIZE + gx] = colorIdx;
      }
    }
  };

  const syncAllTiles = async () => {
    if (!connection) {
      toast.error("No connection to devnet");
      return;
    }

    setIsSyncing(true);

    try {
      for (let ty = 0; ty < TILES_PER_SIDE; ty++) {
        for (let tx = 0; tx < TILES_PER_SIDE; tx++) {
          await loadTile(tx, ty);
        }
      }

      redraw();
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!connection || walletConnected) return;
    console.log("useEffect");
    syncAllTiles();
    // Only a new RPC connection should trigger a full initial tile sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection]);

  const paintAt = async (pixelX: number, pixelY: number, color: NamedColor) => {
    if (!connection) {
      throw Error("no devnet connection");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyWindow = window as any;
    if (!anyWindow?.solana?.publicKey) {
      throw Error("wallet not connected");
    }

    const provider = new anchor.AnchorProvider(connection, anyWindow.solana, {
      commitment: "processed",
      preflightCommitment: "processed",
    });
    anchor.setProvider(provider);

    const program = new anchor.Program(splaceIdl as anchor.Idl, provider);

    const tileX = Math.floor(pixelX / TILE_SIZE);
    const tileY = Math.floor(pixelY / TILE_SIZE);

    const programPk = new anchor.web3.PublicKey(PROGRAM_ID);

    const [tilePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(TILE_SEED), Buffer.from([tileX]), Buffer.from([tileY])],
      programPk,
    );
    const [userStatsPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(USER_STATS_SEED), provider.wallet.publicKey.toBuffer()],
      programPk,
    );

    const userInfo = await connection.getAccountInfo(userStatsPda);

    const cuPriceIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 10_000,
    });
    const { blockhash } = await connection.getLatestBlockhash("processed");

    if (!userInfo) {
      const init_user_stats_instruction = await program.methods
        .initializeUserStats()
        .accounts({
          userStats: userStatsPda,
          signer: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .instruction();

      const tx = new Transaction({
        feePayer: provider.wallet.publicKey,
        recentBlockhash: blockhash,
      })
        .add(cuPriceIx)
        .add(init_user_stats_instruction);

      const signed = await provider.wallet.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: true,
        maxRetries: 3,
      });
      await confirmWithHttpPolling(connection, sig, "processed", 25_000, 600);
      toast.success("User stats account created!");
    }

    const colorIdx = ONCHAIN_COLOR_INDEX[color];
    const paint_instruction = await program.methods
      .paint(pixelX, pixelY, colorIdx)
      .accounts({
        tile: tilePda,
        userStats: userStatsPda,
        signer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .instruction();

    const tx = new Transaction({
      feePayer: provider.wallet.publicKey,
      recentBlockhash: blockhash,
    })
      .add(cuPriceIx)
      .add(paint_instruction);

    const signed = await provider.wallet.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: true,
      maxRetries: 3,
    });
    await confirmWithHttpPolling(connection, sig, "processed", 25_000, 600);

    toast.success("Painted successfully!");
    setIsSigningTransaction(false);
    redraw();
  };

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!walletConnected || isSigningTransaction) return;
    setIsSigningTransaction(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(
      ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE,
    );
    const y = Math.floor(
      ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE,
    );
    if (x < 0 || y < 0 || x >= CANVAS_SIZE || y >= CANVAS_SIZE) {
      setIsSigningTransaction(false);
      return;
    }

    const idx = y * CANVAS_SIZE + x;
    const previousColor = framebuffer.current[idx];
    framebuffer.current[idx] = colorIndex(selected);

    paintAt(x, y, selected).catch((err) => {
      console.error(err);
      if (previousColor !== undefined) {
        framebuffer.current[idx] = previousColor;
      }
      setIsSigningTransaction(false);
      const msg = err?.error?.errorMessage || err?.message || String(err);
      if (/Cooldown not elapsed|6002/.test(msg)) {
        toast.error("Wait for cooldown");
      } else if (/Out of bounds|6001/.test(msg)) {
        toast.error("Pixel out of bounds");
      } else if (/Color does not exist|6003/.test(msg)) {
        toast.error("Invalid color");
      } else {
        toast.error(msg);
      }
    });
  };

  const connectWallet = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyWindow = window as any;
      if (!anyWindow?.solana) {
        toast.error(
          "Phantom (ou wallet compatible) not detected. Install the Phantom extension to use the app.",
        );
        return;
      }
      await anyWindow.solana.connect();
      setWalletConnected(true);
      setConnection(getConnection());
    } catch (e: unknown) {
      if (e instanceof Error) {
        console.error(e);
        toast.error(e.message);
      } else {
        console.error(e);
        toast.error("Wallet connect error");
      }
    }
  };

  const activityLabel = isSigningTransaction
    ? "Confirm in wallet"
    : isSyncing
      ? "Syncing canvas"
      : "Canvas up to date";

  return (
    <main className="app-shell">
      <div className="ambient-grid" aria-hidden="true" />

      <header className="topbar">
        <a className="brand" href="#" aria-label="s/place home">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="brand-word">
            s<span>/</span>place
          </span>
        </a>

        <div className="topbar-actions">
          <div className="network-chip" title="Solana development network">
            <span className="network-dot" />
            Devnet
          </div>
          {walletConnected ? (
            <div className="wallet-connected">
              <span className="wallet-dot" />
              Wallet connected
            </div>
          ) : (
            <button className="wallet-button" onClick={connectWallet}>
              <Wallet aria-hidden="true" />
              Connect wallet
            </button>
          )}
        </div>
      </header>

      <section className="workspace" aria-label="Shared pixel studio">
        <div className="canvas-zone">
          <div className="workspace-heading">
            <div>
              <p className="eyebrow">Shared canvas · 4 on-chain tiles</p>
              <h1>Make your mark.</h1>
            </div>
            <div className="canvas-meta">
              <span>{CANVAS_SIZE} × {CANVAS_SIZE} px</span>
              <span className="meta-separator" />
              <span>
                {hovered ? `${hovered.x}, ${hovered.y}` : "x, y"}
              </span>
            </div>
          </div>

          <div className="canvas-stage">
            <div className="canvas-status" aria-live="polite">
              {(isSigningTransaction || isSyncing) && (
                <Loader2 className="status-spinner" aria-hidden="true" />
              )}
              <span>{activityLabel}</span>
            </div>

            <div
              className={`canvas-frame ${walletConnected ? "is-ready" : "is-locked"}`}
            >
              <span className="corner corner-tl" aria-hidden="true" />
              <span className="corner corner-tr" aria-hidden="true" />
              <span className="corner corner-bl" aria-hidden="true" />
              <span className="corner corner-br" aria-hidden="true" />
              <canvas
                ref={canvasRef}
                onClick={onCanvasClick}
                onMouseMove={onCanvasMove}
                onMouseLeave={() => setHovered(null)}
                className="pixel-canvas"
                aria-label="Pixel canvas"
              />
              {!walletConnected && (
                <div className="canvas-lock">
                  <div className="lock-icon" aria-hidden="true">
                    <MousePointer2 />
                  </div>
                  <strong>Ready when you are</strong>
                  <span>Connect a wallet to place a pixel.</span>
                  <button onClick={connectWallet}>Connect wallet</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="tool-rail" aria-label="Painting tools">
          <div className="rail-section palette-section">
            <div className="section-heading">
              <div>
                <p className="section-index">01</p>
                <h2>Choose a color</h2>
              </div>
              <span
                className="selected-color-preview"
                style={{ backgroundColor: cssColors[colorIndex(selected)] }}
                aria-hidden="true"
              />
            </div>

            <div className="color-grid" role="group" aria-label="Color palette">
              {palette.map((color) => {
                const isSelected = selected === color;
                return (
                  <button
                    key={color}
                    onClick={() => setSelected(color)}
                    className={`color-swatch ${isSelected ? "is-selected" : ""}`}
                    style={{ backgroundColor: cssColors[colorIndex(color)] }}
                    title={color}
                    aria-label={`Color ${color}`}
                    aria-pressed={isSelected}
                  >
                    {isSelected && <Check aria-hidden="true" />}
                  </button>
                );
              })}
            </div>

            <div className="selected-color-label">
              <span>Selected</span>
              <strong>{selected}</strong>
              <code>#{ONCHAIN_COLOR_INDEX[selected].toString().padStart(2, "0")}</code>
            </div>
          </div>

          <div className="rail-section steps-section">
            <p className="section-index">02</p>
            <h2>Place a pixel</h2>
            <ol className="steps-list">
              <li>
                <span>1</span>
                Pick a color
              </li>
              <li>
                <span>2</span>
                Click any pixel
              </li>
              <li>
                <span>3</span>
                Confirm on Solana
              </li>
            </ol>
            <p className="rail-note">
              Every contribution is permanent and shared with everyone.
            </p>
          </div>
        </aside>
      </section>

      <footer className="footer">
        <p>One canvas. Thousands of decisions. Stored on Solana.</p>
        <a
          href="https://github.com/robhox"
          target="_blank"
          rel="noreferrer"
        >
          <Github aria-hidden="true" />
          Built by robhox
        </a>
      </footer>
    </main>
  );
}
