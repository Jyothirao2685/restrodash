import { Request, Response, NextFunction } from 'express';
import { authorizeMasterPin } from '../services/master-pin';

/** Requires master_pin in request body or query; rate limit is scoped per-route. */
export function requireMasterPin(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const routeKey = req.baseUrl + req.path;
  const pin = req.body?.master_pin || (req.query?.master_pin as string | undefined);
  const result = authorizeMasterPin(pin, `http:${ip}:${routeKey}`);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  next();
}
