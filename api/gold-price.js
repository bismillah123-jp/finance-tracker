// api/gold-price.js — Harga emas real-time dari API publik
const GOLD_PRICE_URL = "https://api-harga.vercel.app/api/harga/emas";

let cache = { price: null, updatedAt: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 menit

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Return cache jika masih fresh
  if (cache.price && Date.now() - cache.updatedAt < CACHE_TTL) {
    return res.status(200).json({ price: cache.price, cached: true, updatedAt: cache.updatedAt });
  }

  try {
    const response = await fetch(GOLD_PRICE_URL, {
      headers: { "User-Agent": "FinTrack/1.0" },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    // Format bisa beda-beda, handle beberapa kemungkinan
    const price = data?.perGram || data?.harga_per_gram || data?.price ||
      (Array.isArray(data) ? data[0]?.harga : null) || null;

    if (!price) throw new Error("Price not found in response");

    cache = { price: Number(price), updatedAt: Date.now() };

    return res.status(200).json({ price: cache.price, cached: false, updatedAt: cache.updatedAt });
  } catch (error) {
    console.error("Gold price fetch error:", error);

    // Return cache lama kalau ada, atau fallback
    if (cache.price) {
      return res.status(200).json({ price: cache.price, cached: true, stale: true, updatedAt: cache.updatedAt });
    }

    // Fallback price estimasi
    return res.status(200).json({ price: 1680000, cached: false, fallback: true, updatedAt: Date.now() });
  }
}
