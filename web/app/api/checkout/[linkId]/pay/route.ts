import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.KIRA_API_URL || 'https://4d64ee3c2054.ngrok-free.app/v1'

interface PaymentRequestBody {
  token: string
  customerEmail?: string
}

// Simulate PSP behavior
function simulatePSPCharge(token: string, provider: 'STRIPE' | 'ADYEN') {
  const failureRate = provider === 'STRIPE' ? 0.1 : 0.05
  
  // Handle specific test tokens
  if (token === 'tok_visa_success' || token === 'tok_default_success') {
    return {
      success: Math.random() > failureRate,
      pspReference: `${provider.toLowerCase()}_${Math.random().toString(36).substring(7)}`,
      failureReason: null
    }
  }
  
  if (token === 'tok_card_declined') {
    return {
      success: false,
      pspReference: `${provider.toLowerCase()}_declined${Math.random().toString(36).substring(7)}`,
      failureReason: 'Your card was declined'
    }
  }
  
  if (token === 'tok_network_error') {
    // Stripe fails, Adyen succeeds (simulating failover)
    if (provider === 'STRIPE') {
      throw new Error('Network timeout')
    }
    return {
      success: true,
      pspReference: `adyen_${Math.random().toString(36).substring(7)}`,
      failureReason: null
    }
  }
  
  if (token === 'tok_random_failure') {
    return {
      success: false,
      pspReference: `${provider.toLowerCase()}_random_fail`,
      failureReason: 'Payment processing failed'
    }
  }
  
  // Default behavior
  return {
    success: Math.random() > failureRate,
    pspReference: `${provider.toLowerCase()}_${Math.random().toString(36).substring(7)}`,
    failureReason: Math.random() > 0.5 ? 'Card declined' : 'Insufficient funds'
  }
}

// Mock payment endpoint
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  const { linkId } = await params
  
  try {
    // Check for Idempotency-Key
    const idempotencyKey = request.headers.get('Idempotency-Key')
    if (!idempotencyKey) {
      return NextResponse.json(
        {
          statusCode: 400,
          error: 'Bad Request',
          message: 'Idempotency-Key header is required for payment processing',
          errorCode: 'IDEMPOTENCY_KEY_MISSING'
        },
        { status: 400 }
      )
    }
    
    const body: PaymentRequestBody = await request.json()
    
    console.log('[v0] Calling real payment API:', `${API_BASE_URL}/checkout/${linkId}/pay`)
    console.log('[v0] Payment token:', body.token)
    console.log('[v0] Idempotency key:', idempotencyKey)
    
    const response = await fetch(`${API_BASE_URL}/checkout/${linkId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify(body)
    })
    
    console.log('[v0] Payment API response status:', response.status)
    
    const data = await response.json()
    console.log('[v0] Payment API response data:', data)
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('[v0] Error calling payment API:', error)
    return NextResponse.json(
      {
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error'
      },
      { status: 500 }
    )
  }
}
