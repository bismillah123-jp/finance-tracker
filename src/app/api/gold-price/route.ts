// Harga emas real-time dari API publik
export const runtime = 'edge';

const GOLD_PRICE_URL = "https://api-harga.vercel.app/api/harga/emas";

let cache = { price: null, updatedAt: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 menit

export async function GET() {
  try {
    const now = Date.now();
    
    // Return cached price if still fresh
    if (cache.price && (now - cache.updatedAt) < CACHE_TTL) {
      return Response.json({ 
        price: cache.price, 
        cached: true,
        updatedAt: cache.updatedAt 
      });
    }

    // Fetch fresh price
    const res = await fetch(GOLD_PRICE_URL);
    if (!res.ok) {
      // Return stale cache or fallback
      return Response.json({ 
        price: cache.price || 1680000, 
        cached: true,
        fallback: !cache.price,
        error: `API failed: ${res.status}`
      });
    }

    const data = await res.json();
    const newPrice = data?.harga_emas_24k || data?.price || 1680000;
    
    // Update cache
    cache = { price: newPrice, updatedAt: now };
    
    return Response.json({ 
      price: newPrice, 
      cached: false,
      updatedAt: now 
    });

  } catch (error) {
    console.error("Gold price fetch error:", error);
    return Response.json({ 
      price: cache.price || 1680000,
      cached: true,
      fallback: !cache.price,
      error: error.message 
    }, { status: 500 });
  }
}
