// ============================================================
// RankForge — Vercel Serverless Function
// Discord OAuth2 code → token exchange
// Deploy this on Vercel (free forever)
//
// Setup:
// 1. Push this file to a GitHub repo
// 2. Import repo on vercel.com
// 3. Add environment variable: DISCORD_CLIENT_SECRET = your secret
// 4. Deploy — you'll get a URL like https://your-app.vercel.app/api/discord-oauth
// ============================================================

export default async function handler(req, res) {
  // Allow CORS from your GitHub Pages site
  res.setHeader('Access-Control-Allow-Origin', 'https://rankforgehub.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { code, redirectUri } = req.body;

  if (!code || !redirectUri) {
    return res.status(400).json({ error: 'Missing code or redirectUri' });
  }

  // Your Discord App Client ID (not secret, safe to hardcode)
  const DISCORD_CLIENT_ID = '1465025250189381869'; // <-- replace this

  // Client secret is stored as Vercel Environment Variable (never in code)
  const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;

  if (!DISCORD_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Server misconfigured: missing secret' });
  }

  try {
    // Step 1: Exchange code for access token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type:    'authorization_code',
        code,
        redirect_uri:  redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      console.error('Discord token error:', tokenData);
      return res.status(400).json({ error: tokenData.error_description || 'Token exchange failed' });
    }

    // Step 2: Fetch Discord user info
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userRes.json();

    if (!userRes.ok || !userData.id) {
      return res.status(400).json({ error: 'Failed to fetch Discord user' });
    }

    // Step 3: Return safe user info only — access token never sent to client
    return res.status(200).json({
      user: {
        id:          userData.id,
        username:    userData.username,
        global_name: userData.global_name,
        avatar:      userData.avatar,
        discriminator: userData.discriminator || '0',
      }
    });

  } catch (err) {
    console.error('discord-oauth error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
