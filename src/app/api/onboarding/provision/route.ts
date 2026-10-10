import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkSubdomainAvailability } from '@/lib/subdomains';
import { provisionTenantInstance } from '@/lib/tenant-db-seeder';

const ProvisioningSchema = z.object({
  subdomain: z.string().min(3).max(30),
  restaurantName: z.string().min(2).max(100),
  ownerName: z.string().min(2).max(100),
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(6),
  masterPin: z.string().length(4).optional(),
  approvalPin: z.string().min(4).max(6).optional(),
  tableCount: z.number().int().min(1).max(200).optional(),
  currency: z.string().optional(),
  currencySymbol: z.string().optional(),
  timezone: z.string().optional(),
  taxPercentage: z.number().min(0).max(100).optional(),
  plan: z.enum(['monthly_35k', 'annual']).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parsed = ProvisioningSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    // 1. Verify subdomain availability
    const subCheck = checkSubdomainAvailability(payload.subdomain);
    if (!subCheck.available) {
      return NextResponse.json(
        {
          success: false,
          error: subCheck.reason || 'Subdomain is not available.',
        },
        { status: 409 }
      );
    }

    // 2. Execute Tenant Database Provisioning
    const result = provisionTenantInstance(payload);

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Provisioning error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An unexpected error occurred during instance provisioning.',
      },
      { status: 500 }
    );
  }
}
