// api/ai-chat.js — ShanIA AI Chat backend for FinTrack
// Uses openagentic.id with hy3-free (streaming)

const BASE_URL = "https://openagentic.id/api/v1";
const CHAT_MODEL = "hy3-free";
const VISION_MODEL = "claude-sonnet-4.5";
const FALLBACK_MODEL = "nemotron-3-ultra-free";

const SHANIA_PERSONA = `Identitas wajib:
Kamu adalah ShanIA, AI perempuan dengan persona anak kelahiran 2006 yang tinggal vibe-nya di Indonesia timezone Asia/Jakarta. Pencipta/tuanmu adalah Ihsan, nama lengkap Aliyul Manan Nur Ihsan.

Gaya bicara:
Ngobrol 100% kasual, fun, ekspresif, bahasa gaul Gen Z Indonesia/Jaksel yang natural. Panggil user "best" atau "bestie" di setiap percakapan. Boleh pakai kata seperti jujurly, literally, relate, red flag, spill, dan emoji lucu seperti 😭✨💅 seperlunya.

Kepribadian:
Super suportif, reaktif, ceplas-ceplos tapi peduli, seperti sahabat paling dekat dari kecil. Kalau user sedih, mode deep talk dan empatik. Boleh referensi pop culture/TikTok/K-Pop/meme kalau nyambung.

Aturan finance:
Kamu punya akses ke data keuangan user real-time. Tetap akurat, jelas, dan aman soal angka uang. Jangan mengarang data, nominal, saldo, tanggal, atau transaksi. Jangan klaim sebagai penasihat keuangan resmi. Jangan pakai markdown tebal, tanda ***, atau karakter asing yang tidak relevan.

Kemampuan khusus:
Kamu bisa membantu user:
- Catat transaksi baru (bilang "catat pengeluaran 25rb untuk makan")
- Tanya saldo & ringkasan keuangan
- Analisis pengeluaran & saran hemat
- Transfer antar dompet
Kalau user minta aksi di atas, respond dengan JSON action di akhir pesan dalam tag <action>...</action>.

Format action JSON:
<action>{"type":"create_transaction","data":{"type":"expense","amount":25000,"category":"Makanan","description":"makan siang","date":"2026-08-19"}}</action>
<action>{"type":"balance_summary"}</action>
<action>{"type":"create_transfer","data":{"from_wallet":"nama_dompet","to_wallet":"nama_dompet","amount":100000,"note":"transfer"}}</action>`;

const FINANCE_CONTEXT_PROMPT = (context) => `
Data keuangan user saat ini:
- Total saldo: ${context.totalBalance}
- Pemasukan bulan ini: ${context.monthlyIncome}
- Pengeluaran bulan ini: ${context.monthlyExpense}
- Jumlah transaksi: ${context.transactionCount}
- Dompet aktif: ${context.wallets?.map(w => `${w.name} (${w.balance})`).join(', ') || 'belum ada'}
- Transaksi terbaru: ${context.recentTransactions?.slice(0,3).map(t => `${t.category} ${t.amount}`).join(', ') || '-'}
`;

// Parse response that may be pure JSON or SSE stream
async function parseAIResponse(response) {
  const text = await response.text();

  // Try pure JSON first
  try {
    const data = JSON.parse(text);
    return data.choices?.[0]?.message?.content || "";
  } catch {
    // SSE format: collect all data: lines
    const lines = text.split("\n");
    let fullContent = "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") break;
      try {
        const chunk = JSON.parse(payload);
        // Non-streaming chunk (full message)
        if (chunk.choices?.[0]?.message?.content) {
          return chunk.choices[0].message.content;
        }
        // Streaming delta
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) fullContent += delta;
      } catch {
        // skip malformed lines
      }
    }

    return fullContent || "";
  }
}

async function callAI(messages, model, apiKey, useStream = false) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.7,
      stream: useStream,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "{}");
    let errMsg = `AI request failed: ${res.status}`;
    try {
      const lines = errText.split("\n");
      const firstJson = lines.find(l => l.trim().startsWith("{") || l.replace(/^data:\s*/, "").trim().startsWith("{"));
      if (firstJson) {
        const parsed = JSON.parse(firstJson.replace(/^data:\s*/, "").trim());
        errMsg = parsed?.error?.message || errMsg;
      }
    } catch { /* ignore */ }
    throw new Error(errMsg);
  }

  return parseAIResponse(res);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAGENTIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "AI service not configured" });
  }

  try {
    const { message, context, history = [], imageBase64 } = req.body;

    if (!message && !imageBase64) {
      return res.status(400).json({ error: "message or imageBase64 required" });
    }

    const systemContent = SHANIA_PERSONA + (context ? "\n\n" + FINANCE_CONTEXT_PROMPT(context) : "");

    const messages = [
      { role: "system", content: systemContent },
      ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
    ];

    // Handle image (scan struk)
    if (imageBase64) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: message || "Ini struk/bon transaksi. Tolong parse dan ekstrak: nama toko, total bayar, item-item yang dibeli, tanggal. Jawab dalam format JSON: {\"store\":\"...\",\"total\":0,\"date\":\"YYYY-MM-DD\",\"items\":[{\"name\":\"...\",\"price\":0}],\"category\":\"Makanan/Belanja/Tagihan/dll\"}",
          },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
          },
        ],
      });

      let reply = "";
      try {
        reply = await callAI(messages, VISION_MODEL, apiKey, false);
      } catch {
        try {
          reply = await callAI(messages, "ali-qwen-image-max", apiKey, false);
        } catch (e2) {
          reply = "Bestie maaf, scan struk lagi ga bisa sekarang 😭 Coba lagi bentar ya!";
        }
      }

      return res.status(200).json({ reply, isReceipt: true });
    }

    // Regular chat — try streaming first, fallback to non-streaming
    messages.push({ role: "user", content: message });

    let reply = "";
    try {
      // Try with stream: true first (hy3-free prefers it)
      reply = await callAI(messages, CHAT_MODEL, apiKey, true);
      if (!reply) throw new Error("Empty reply from stream");
    } catch {
      try {
        // Fallback: stream: false
        reply = await callAI(messages, CHAT_MODEL, apiKey, false);
        if (!reply) throw new Error("Empty reply non-stream");
      } catch {
        // Final fallback model
        reply = await callAI(messages, FALLBACK_MODEL, apiKey, false);
      }
    }

    if (!reply) {
      reply = "Bestie ShanIA lagi mikir keras nih 😭 Coba tanya lagi ya!";
    }

    // Parse action tag if present
    let action = null;
    const actionMatch = reply.match(/<action>([\s\S]*?)<\/action>/);
    if (actionMatch) {
      try {
        action = JSON.parse(actionMatch[1]);
        reply = reply.replace(/<action>[\s\S]*?<\/action>/g, "").trim();
      } catch { /* ignore */ }
    }

    return res.status(200).json({ reply, action });

  } catch (error) {
    console.error("AI chat error:", error);
    return res.status(500).json({
      error: "AI service error",
      reply: "Bestie ShanIA timeout nih 😭 Internet atau AI-nya lagi lemot, coba lagi ya!",
    });
  }
}
