import { NextRequest, NextResponse } from 'next/server';
import { checkSubdomainAvailability } from '@/lib/subdomains';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subdomain } = body;

    if (!subdomain || typeof subdomain !== 'string') {
      return NextResponse.json(
        { valid: false, available: false, reason: 'Subdomain is required.' },
        { status: 400 }
      );
    }

    const result = checkSubdomainAvailability(subdomain);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { valid: false, available: false, reason: 'Internal server error checking subdomain.' },
      { status: 500 }
    );
  }
}
