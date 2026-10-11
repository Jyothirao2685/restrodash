import { NextResponse } from 'next/server';

interface DemoRequestBody {
  name?: string;
  phone?: string;
  restaurant?: string;
  city?: string;
  email?: string;
  interest?: string;
  website?: string; // honeypot
  formStartTime?: number;
}

// In-memory rate limiting map: ip -> timestamps[]
const rateLimitMap = new Map<string, number[]>();

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown-ip';
    const now = Date.now();

    // Check rate limit: 5 requests per 10 minutes
    const windowMs = 10 * 60 * 1000;
    const timestamps = rateLimitMap.get(ip)?.filter((t) => now - t < windowMs) || [];
    if (timestamps.length >= 5) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please call us directly at +91 98765 43210.',
        },
        { status: 429 }
      );
    }
    timestamps.push(now);
    rateLimitMap.set(ip, timestamps);

    const body: DemoRequestBody = await req.json();

    // 1. Honeypot check
    if (body.website && body.website.trim().length > 0) {
      return NextResponse.json({ success: true, message: 'Received' });
    }

    // 2. Minimum fill time check (reject if filled under 2 seconds)
    if (body.formStartTime && now - body.formStartTime < 2000) {
      return NextResponse.json({ success: true, message: 'Received' });
    }

    // 3. Required field validation
    const name = body.name?.trim() || '';
    const phone = body.phone?.trim() || '';
    const restaurant = body.restaurant?.trim() || '';
    const city = body.city?.trim() || '';
    const email = body.email?.trim() || '';
    const interest = body.interest?.trim() || 'both';

    if (!name || name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid full name.' },
        { status: 400 }
      );
    }

    // Phone validation: allow digits, +, spaces, hyphens; min 7 digits
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid phone number.' },
        { status: 400 }
      );
    }

    if (!restaurant || restaurant.length < 2 || restaurant.length > 120) {
      return NextResponse.json(
        { success: false, error: 'Please enter your restaurant name.' },
        { status: 400 }
      );
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    // Lead recorded successfully
    return NextResponse.json({
      success: true,
      data: {
        name,
        restaurant,
        phone,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unable to process demo request. Please call us at +91 98765 43210.',
      },
      { status: 500 }
    );
  }
}
