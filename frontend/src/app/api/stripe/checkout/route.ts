
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getOrCreateCustomer, createCheckoutSession } from '@/lib/stripe';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { priceId, successUrl, cancelUrl } = await req.json();

    if (!priceId || !successUrl || !cancelUrl) {
      return new NextResponse('Missing required parameters', { status: 400 });
    }

    // Get or create customer
    const customer = await getOrCreateCustomer(
      user.email || '',
      user.id,
      user.user_metadata?.full_name
    );

    // Create checkout session
    const session = await createCheckoutSession({
      priceId,
      customerId: customer.id,
      successUrl,
      cancelUrl,
      mode: 'subscription',
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
