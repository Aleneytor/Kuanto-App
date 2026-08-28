let cache = {
  data: null,
  expiresAt: 0,
};

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const now = Date.now();

    // Si la cache sigue vigente, devolverla
    if (cache.data && now < cache.expiresAt) {
      return res.status(200).json({
        ...cache.data,
        cached: true,
      });
    }

    const [binanceRate, bybitRate] = await Promise.all([
      fetchBinanceBuy(),
      fetchBybitBuy(),
    ]);

    const validRates = [binanceRate, bybitRate].filter(
      (rate) => Number.isFinite(rate) && rate > 0
    );

    if (validRates.length === 0) {
      // Si falla todo pero tenemos una tasa anterior, devolverla como stale
      if (cache.data) {
        return res.status(200).json({
          ...cache.data,
          cached: true,
          stale: true,
        });
      }

      throw new Error("No valid USDT/VES rates available");
    }

    const averageRate =
      validRates.reduce((sum, rate) => sum + rate, 0) / validRates.length;

    const fetchedAt = new Date();
    const expiresAt = new Date(fetchedAt.getTime() + CACHE_TTL_MS);

    const responseData = {
      success: true,
      pair: "USDT/VES",
      rate: Number(averageRate.toFixed(6)),
      source: "p2p-average",
      sources: {
        binance: binanceRate > 0 ? Number(binanceRate.toFixed(6)) : null,
        bybit: bybitRate > 0 ? Number(bybitRate.toFixed(6)) : null,
      },
      fetchedAt: fetchedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      stale: false,
    };

    cache = {
      data: responseData,
      expiresAt: expiresAt.getTime(),
    };

    // También permitir cache HTTP/CDN
    res.setHeader(
      "Cache-Control",
      "s-maxage=1800, stale-while-revalidate=300"
    );

    return res.status(200).json({
      ...responseData,
      cached: false,
    });
  } catch (error) {
    console.error("USDT rate error:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to fetch USDT/VES rate",
    });
  }
}

async function fetchBinanceBuy() {
  try {
    const response = await fetch(
      "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          Origin: "https://p2p.binance.com",
        },
        body: JSON.stringify({
          asset: "USDT",
          fiat: "VES",
          merchantCheck: false,
          page: 1,
          payTypes: [],
          publisherType: null,
          rows: 10,
          tradeType: "BUY",
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Binance HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data?.data?.length) {
      return 0;
    }

    let prices = data.data
      .map((item) => Number.parseFloat(item?.adv?.price))
      .filter((price) => Number.isFinite(price) && price > 0);

    // Filtrar outliers respecto a la mediana
    if (prices.length > 3) {
      const sorted = [...prices].sort((a, b) => a - b);
      const middle = Math.floor(sorted.length / 2);

      const median =
        sorted.length % 2 === 0
          ? (sorted[middle - 1] + sorted[middle]) / 2
          : sorted[middle];

      const tolerance = median * 0.1;

      prices = prices.filter(
        (price) => Math.abs(price - median) <= tolerance
      );
    }

    if (prices.length === 0) {
      return 0;
    }

    return prices.reduce((sum, price) => sum + price, 0) / prices.length;
  } catch (error) {
    console.error("Binance error:", error);
    return 0;
  }
}

async function fetchBybitBuy() {
  try {
    const response = await fetch(
      "https://api2.bybit.com/fiat/otc/item/online",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          Origin: "https://www.bybit.com",
        },
        body: JSON.stringify({
          tokenId: "USDT",
          currencyId: "VES",
          side: "1",
          size: "10",
          page: "1",
          amount: "",
          authMaker: false,
          canTrade: false,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Bybit HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data?.result?.items?.length) {
      return 0;
    }

    const prices = data.result.items
      .map((item) => Number.parseFloat(item?.price))
      .filter((price) => Number.isFinite(price) && price > 0);

    if (prices.length === 0) {
      return 0;
    }

    return prices.reduce((sum, price) => sum + price, 0) / prices.length;
  } catch (error) {
    console.error("Bybit error:", error);
    return 0;
  }
}
