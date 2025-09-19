import { Connection } from "@solana/web3.js";

let _conn: Connection | null = null;

function absoluteUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  if (typeof window !== "undefined") {
    return new URL(url, window.location.origin).toString();
  }
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `http://localhost:${process.env.PORT || 3000}`);
  return new URL(url, base).toString();
}

export function getConnection(): Connection {
  if (!_conn) {
    const httpRaw = "/api/solana-rpc";
    const http = absoluteUrl(httpRaw);

    _conn = new Connection(http, { commitment: "processed" });
  }
  return _conn;
}
