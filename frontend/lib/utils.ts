import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type {
  Commitment,
  Connection,
  RpcResponseAndContext,
  SignatureResult,
} from "@solana/web3.js";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function confirmWithHttpPolling(
  connection: Connection,
  signature: string,
  commitment: Commitment = "processed",
  timeoutMs = 30_000,
  intervalMs = 600,
): Promise<RpcResponseAndContext<SignatureResult | null>> {
  const start = Date.now();
  for (;;) {
    const statuses = await connection.getSignatureStatuses([signature]);
    const st = statuses.value[0];

    if (st) {
      if (st.err)
        throw new Error(`Transaction failed: ${JSON.stringify(st.err)}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cs = (st as any).confirmationStatus as
        | "processed"
        | "confirmed"
        | "finalized"
        | undefined;
      if (
        cs === "confirmed" ||
        cs === "finalized" ||
        (commitment === "processed" && st.confirmations !== null)
      ) {
        return { context: statuses.context, value: st };
      }
    }
    if (Date.now() - start > timeoutMs) throw new Error("Confirmation timeout");
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
