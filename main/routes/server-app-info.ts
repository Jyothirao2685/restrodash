/** Returns Server App local network access URLs for settings QR code rendering. */
import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import { getLocalIP, getAllLocalIPs } from '../server-state';
import { getServerAppPort } from '../server-app-state';
import { isServerAppEnabled, getDatabase } from '../db';
import { asyncHandler } from '../middleware/async-handler';
import { RegionalNotConfiguredError, resolveRegionalSnapshot } from '../countries';

const router = Router();

function handleServerAppInfo(_req: Request, res: Response) {
  if (!isServerAppEnabled()) {
    return res.status(404).json({ error: 'Not found' });
  }
  const rows = getDatabase().prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const row of rows) settings[row.key] = row.value;
  let snapshot;
  try {
    snapshot = resolveRegionalSnapshot(settings);
  } catch (error) {
    if (error instanceof RegionalNotConfiguredError) return res.status(409).json({ error: 'regional_not_configured' });
    throw error;
  }
  res.json({
    language: settings.language || null,
    country: snapshot.country,
    currency: snapshot.currency,
    currency_symbol: snapshot.currencySymbol,
    currency_position: snapshot.currencyPosition,
    currency_fraction_digits: snapshot.currencyFractionDigits,
    kds_enabled: settings.kds_enabled !== 'false',
  });
}

router.get('/info', asyncHandler(async (req: Request, res: Response) => {
  handleServerAppInfo(req, res);
}));

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  // If requested with Accept application/json and /info shape or standalone
  if (req.query.format === 'regional') {
    return handleServerAppInfo(req, res);
  }
  if (!isServerAppEnabled()) {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    const port = getServerAppPort();
    const ip = getLocalIP();
    const allIps = getAllLocalIPs();

    const mdnsUrl = `http://flo.local:${port}`;
    const ipUrl = `http://${ip}:${port}`;
    const ipsData = await Promise.all(allIps.map(async (localIp) => {
      const url = `http://${localIp}:${port}`;
      try {
        const qr_data = await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', width: 256 });
        return { ip: localIp, url, qr_data };
      } catch {
        return { ip: localIp, url, qr_data: null };
      }
    }));

    const primaryIpData = ipsData.find((entry) => entry.ip === ip);

    res.json({
      mdns_url: mdnsUrl,
      ip_url: ipUrl,
      qr_url: ipUrl,
      qr_data_url: primaryIpData?.qr_data ?? null,
      ips_data: ipsData,
    });
  } catch (error: any) {
    console.error('[API] Internal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

export const serverAppInfoRoutes = router;
