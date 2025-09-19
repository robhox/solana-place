"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet } from "lucide-react";
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

const COLOR_CLASS: Record<NamedColor, string> = {
  white: "bg-white border",
  red: "bg-red-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  yellow: "bg-yellow-500",
  lime: "bg-lime-500",
  green: "bg-green-500",
  emerald: "bg-emerald-500",
  teal: "bg-teal-500",
  cyan: "bg-cyan-500",
  sky: "bg-sky-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  purple: "bg-purple-500",
  fuchsia: "bg-fuchsia-500",
  pink: "bg-pink-500",
  rose: "bg-rose-500",
  slate: "bg-slate-500",
  gray: "bg-gray-500",
  zinc: "bg-zinc-500",
  neutral: "bg-neutral-500",
  stone: "bg-stone-500",
};
const colorToClass = (c: NamedColor) => COLOR_CLASS[c];

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
  }, []);

  const onCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / RENDER_SCALE);
    const y = Math.floor((e.clientY - rect.top) / RENDER_SCALE);
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
    } catch (e) {
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
    const x = Math.floor((e.clientX - rect.left) / RENDER_SCALE);
    const y = Math.floor((e.clientY - rect.top) / RENDER_SCALE);
    if (x < 0 || y < 0 || x >= CANVAS_SIZE || y >= CANVAS_SIZE) return;

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

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-6 py-4">
      <div className="w-full flex items-center gap-2 max-w-6xl mx-auto mb-2">
        <h1 className="text-2xl font-extrabold">Welcome to s/place</h1>
        <Badge className="mt-1" variant="secondary">
          devnet
        </Badge>
      </div>
      <div className="mx-auto max-w-6xl grid md:grid-cols-[auto_240px] gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Canvas (4 tiles)
              <Badge variant="secondary">
                {CANVAS_SIZE}×{CANVAS_SIZE}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {!walletConnected && (
              <div className="flex flex-col items-center justify-center">
                <Button
                  onClick={connectWallet}
                  className="w-full flex items-center gap-2"
                >
                  <Wallet className="h-4 w-4" /> Connect wallet
                </Button>
                <p className="text-sm text-center mt-2">
                  Connect your wallet to start drawing on the canvas.
                </p>
              </div>
            )}
            {isSyncing && (
              <div className="flex items-center justify-center">
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Loading canvas...
              </div>
            )}
            {isSigningTransaction && (
              <div className="flex items-center justify-center">
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Waiting for transaction to be signed...
              </div>
            )}

            <div className="relative inline-block mx-auto rounded overflow-hidden border">
              <canvas
                ref={canvasRef}
                onClick={onCanvasClick}
                onMouseMove={onCanvasMove}
                onMouseLeave={() => setHovered(null)}
                className="cursor-crosshair block"
                aria-label="Pixel canvas"
              />
              <div className="pointer-events-none absolute inset-0">
                {[0, 1].map((ty) =>
                  [0, 1].map((tx) => (
                    <div
                      key={`${tx}-${ty}`}
                      className="absolute text-[10px] opacity-70 bg-white/60 px-1 rounded"
                      style={{
                        left: tx * TILE_SIZE * RENDER_SCALE + 4,
                        top: ty * TILE_SIZE * RENDER_SCALE + 4,
                      }}
                    >
                      tile ({tx},{ty})
                    </div>
                  )),
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Color Picker</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-1">
                {["white", ...TAILWIND_500].map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelected(c as NamedColor)}
                    className={`h-7 rounded-md border border-gray-100/90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${colorToClass(c as NamedColor)} ${
                      selected === c ? "ring-2 ring-offset-2" : ""
                    }`}
                    title={c}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="flex justify-center mt-4 text-sm font-medium text-gray-400">
        <p>
          Created by{" "}
          <a href="https://github.com/robhox" target="_blank">
            robhox
          </a>
        </p>
      </div>
    </div>
  );
}
