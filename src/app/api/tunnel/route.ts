import { NextRequest, NextResponse } from 'next/server';
import tunnelManager from '@/lib/tunnel-manager';

export async function GET() {
  try {
    const state = tunnelManager.getState();
    return NextResponse.json({
      success: true,
      ...state,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to retrieve tunnel status' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, rotationIntervalHours, shiftKillswitch } = body;

    if (action === 'start') {
      await tunnelManager.start();
      return NextResponse.json({
        success: true,
        message: 'Tunnel started successfully',
        ...tunnelManager.getState(),
      });
    }

    if (action === 'stop') {
      tunnelManager.stop('User stopped via API');
      return NextResponse.json({
        success: true,
        message: 'Tunnel stopped',
        ...tunnelManager.getState(),
      });
    }

    if (action === 'rotate') {
      await tunnelManager.rotate();
      return NextResponse.json({
        success: true,
        message: 'Tunnel rotated successfully',
        ...tunnelManager.getState(),
      });
    }

    if (action === 'config') {
      tunnelManager.configure({
        rotationIntervalHours,
        shiftKillswitch,
      });
      return NextResponse.json({
        success: true,
        message: 'Tunnel configuration updated',
        ...tunnelManager.getState(),
      });
    }

    return NextResponse.json(
      { success: false, error: `Invalid action '${action}'. Expected 'start', 'stop', 'rotate', or 'config'.` },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        ...tunnelManager.getState(),
        error: err.message || 'Tunnel operation failed',
      },
      { status: 500 }
    );
  }
}
