/* ═══════════════════════════════════════════════════════════
   Crafty GIS — Vercel Serverless Function
   Sentinel Hub OAuth token proxy
   ═══════════════════════════════════════════════════════════ */

module.exports = async function handler(req, res) {
  // Only POST allowed (mirrors the Express proxy endpoint)
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const clientId = process.env.SENTINEL_HUB_CLIENT_ID;
    const clientSecret = process.env.SENTINEL_HUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(400).json({ error: 'Sentinel Hub credentials missing on server' });
    }

    const body = 'grant_type=client_credentials&client_id=' +
      encodeURIComponent(clientId) +
      '&client_secret=' + encodeURIComponent(clientSecret);

    const authRes = await fetch('https://services.sentinel-hub.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    if (!authRes.ok) {
      const errText = await authRes.text();
      throw new Error(`Sentinel Hub auth returned status ${authRes.status}: ${errText}`);
    }

    const data = await authRes.json();
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(data);
  } catch (error) {
    console.error('Sentinel Hub Token Function Error:', error);
    res.status(500).json({ error: error.message });
  }
};
