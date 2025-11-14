import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.KIRA_API_URL || 'https://4d64ee3c2054.ngrok-free.app/v1'

interface QuoteRequestBody {
  customerEmail?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  const { linkId } = await params
  
  try {
    const body: QuoteRequestBody = await request.json()
    
    console.log('[v0] Calling real API:', `${API_BASE_URL}/checkout/${linkId}/quote`)
    console.log('[v0] Request body:', body)
    
    // Call real backend API
    const response = await fetch(`${API_BASE_URL}/checkout/${linkId}/quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify(body)
    })
    
    console.log('[v0] API response status:', response.status)
    
    const data = await response.json()
    console.log('[v0] API response data:', data)
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('[v0] Error calling quote API:', error)
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
