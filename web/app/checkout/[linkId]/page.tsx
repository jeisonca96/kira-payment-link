'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, TrendingUp, XCircle } from 'lucide-react'

// Types
type PaymentStatus = 'IDLE' | 'IN_PROGRESS' | 'SUCCESS' | 'ERROR'

interface QuoteData {
  linkId: string
  currency: string
  baseAmount: number
  totalAmount: number
  destinationAmountMxn: number
  fxRate: number
  fees: {
    totalFees: number
    breakdown: Array<{
      type: string
      amount: number
      description: string
    }>
  }
}

interface PaymentResponse {
  transactionId: string
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED'
  amountCharged: number
  currency: string
  pspReference: string
  pspProvider: 'STRIPE' | 'ADYEN'
}

interface ErrorResponse {
  statusCode: number
  error: string
  message: string
  errorCode?: string
  details?: {
    linkId?: string
    currentStatus?: string
    allowedStatus?: string
    primaryGatewayError?: string
    secondaryGatewayError?: string
  }
}

const API_BASE_URL = 'https://8ccbc9b20b1d.ngrok-free.app/v1'

// Mock tokenization function with all test scenarios
function mockTokenizeCard(cardNumber: string): string {
  console.log('[v0] Tokenizing card:', cardNumber.slice(-4))
  
  if (cardNumber.endsWith('4242') || cardNumber === 'tok_visa_success') {
    return 'tok_visa_success'
  }
  
  if (cardNumber.endsWith('4000') || cardNumber === 'tok_card_declined') {
    return 'tok_card_declined'
  }
  
  if (cardNumber.endsWith('5000') || cardNumber === 'tok_network_error') {
    return 'tok_network_error'
  }
  
  return Math.random() < 0.1 ? 'tok_random_failure' : 'tok_default_success'
}

function formatCardNumber(value: string): string {
  const cleaned = value.replace(/\s/g, '')
  const chunks = cleaned.match(/.{1,4}/g) || []
  return chunks.join(' ')
}

function formatExpiryDate(value: string): string {
  const cleaned = value.replace(/\D/g, '')
  if (cleaned.length >= 2) {
    return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4)
  }
  return cleaned
}

export default function CheckoutPage() {
  const params = useParams()
  const linkId = params.linkId as string
  
  const [quote, setQuote] = useState<QuoteData | null>(null)
  const [loadingQuote, setLoadingQuote] = useState(true)
  const [linkError, setLinkError] = useState<ErrorResponse | null>(null)
  
  const [cardNumber, setCardNumber] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [cvc, setCvc] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('IDLE')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [paymentResult, setPaymentResult] = useState<PaymentResponse | null>(null)

  useEffect(() => {
    if (linkId) {
      fetchQuote()
    }
  }, [linkId])

  async function fetchQuote() {
    console.log('[v0] Fetching quote for linkId:', linkId)
    setLoadingQuote(true)
    try {
      const url = `/api/checkout/${linkId}/quote`
      console.log('[v0] Quote URL:', url)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerEmail: customerEmail || undefined })
      })
      
      console.log('[v0] Quote response status:', response.status)
      
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json().catch(() => ({
          statusCode: response.status,
          error: 'Unknown Error',
          message: 'Failed to fetch quote'
        }))
        console.error('[v0] Quote error:', errorData)
        
        setLinkError(errorData)
        setErrorMessage(errorData.message)
        return
      }
      
      const data = await response.json()
      console.log('[v0] Quote data:', data)
      setQuote(data)
    } catch (error) {
      console.error('[v0] Quote fetch error:', error)
      setErrorMessage('Unable to load payment quote. Please refresh the page.')
    } finally {
      setLoadingQuote(false)
    }
  }



  async function handlePayment(e: React.FormEvent) {
    e.preventDefault()
    
    if (!quote) return
    
    setErrorMessage('')
    setSubmitting(true)
    setPaymentStatus('IN_PROGRESS')
    
    try {
      const token = mockTokenizeCard(cardNumber)
      console.log('[v0] Generated token:', token)
      
      if (token === 'tok_network_error') {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
      
      const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substring(7)}`
      
      const url = `/api/checkout/${linkId}/pay`
      console.log('[v0] Payment URL:', url)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          token,
          customerEmail: customerEmail || undefined
        })
      })
      
      console.log('[v0] Payment response status:', response.status)
      
      const data = await response.json()
      console.log('[v0] Payment response data:', data)
      
      if (!response.ok) {
        const errorData = data as ErrorResponse
        setPaymentStatus('ERROR')
        
        if (errorData.errorCode === 'PAYMENT_LINK_NOT_ACTIVE') {
          setErrorMessage(
            `This payment link is no longer active. Current status: ${errorData.details?.currentStatus || 'INACTIVE'}.`
          )
        } else if (errorData.errorCode === 'PAYMENT_PROCESSING_FAILED') {
          const details = (errorData as any).details
          const primaryError = details?.primaryGatewayError || ''
          const secondaryError = details?.secondaryGatewayError || ''
          const combinedErrors = `${primaryError} ${secondaryError}`.toLowerCase()
          
          if (combinedErrors.includes('declined') || combinedErrors.includes('issuer')) {
            setErrorMessage('Your card was declined. Please check your card details or use a different payment method.')
          } 
          else if (combinedErrors.includes('unavailable') || combinedErrors.includes('gateway')) {
            setErrorMessage('Payment gateways are temporarily unavailable. Please try again in a few moments.')
          } 
          else {
            setErrorMessage(errorData.message || 'Payment processing failed. Please try again.')
          }
        }
        else {
          setErrorMessage(errorData.message || 'Payment failed. Please try again.')
        }
        setSubmitting(false)
        return
      }
      
      setPaymentResult(data)
      
      if (data.status === 'PAID' || data.status === 'PROCESSING' || data.status === 'PENDING') {
        setPaymentStatus('SUCCESS')
      } else if (data.status === 'FAILED' || data.status === 'CANCELLED') {
        setPaymentStatus('ERROR')
        setErrorMessage('Payment failed. Please try again.')
      }
    } catch (error) {
      console.error('[v0] Payment error:', error)
      setPaymentStatus('ERROR')
      setErrorMessage('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatUSD = (cents: number) => `$${(cents / 100).toFixed(2)}`
  const formatMXN = (cents: number) => `$${(cents / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s/g, '')
    if (value.length <= 16 && /^\d*$/.test(value)) {
      setCardNumber(value)
    }
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    if (value.length <= 4) {
      setExpiryDate(value)
    }
  }

  if (loadingQuote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-fuchsia-950 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-fuchsia-400 mx-auto mb-4" />
          <p className="text-purple-200">Loading payment details...</p>
        </div>
      </div>
    )
  }

  if (!quote || linkError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-fuchsia-950 flex items-center justify-center p-4">
        <Card className="max-w-md border-red-400/30 bg-purple-900/50 backdrop-blur">
          <CardHeader>
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center border-2 border-red-400">
              <XCircle className="h-10 w-10 text-red-400" />
            </div>
            <CardTitle className="text-center text-xl text-white">
              {linkError?.errorCode === 'PAYMENT_LINK_NOT_ACTIVE' 
                ? 'Payment Link Not Available' 
                : 'Unable to Load Payment'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive" className="border-red-400/50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
            
            {linkError?.details && (
              <div className="bg-purple-800/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-purple-300">Link ID:</span>
                  <span className="font-mono text-white text-xs">{linkError.details.linkId}</span>
                </div>
                {linkError.details.currentStatus && (
                  <div className="flex justify-between">
                    <span className="text-purple-300">Current Status:</span>
                    <span className="font-semibold text-red-400">{linkError.details.currentStatus}</span>
                  </div>
                )}
                {linkError.details.allowedStatus && (
                  <div className="flex justify-between">
                    <span className="text-purple-300">Required Status:</span>
                    <span className="font-semibold text-white">{linkError.details.allowedStatus}</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="pt-4 border-t border-purple-700">
              <p className="text-sm text-purple-300 text-center mb-4">
                {linkError?.errorCode === 'PAYMENT_LINK_NOT_ACTIVE'
                  ? 'This payment link has already been used or has expired. Please request a new payment link.'
                  : 'Please contact support if you continue to experience issues.'}
              </p>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
                className="w-full bg-purple-800 border-purple-600 text-white hover:bg-purple-700"
              >
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (paymentStatus === 'SUCCESS' && paymentResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-fuchsia-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-fuchsia-400/30 shadow-2xl bg-purple-900/50 backdrop-blur">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-fuchsia-500/20 flex items-center justify-center border-2 border-fuchsia-400">
              <CheckCircle2 className="h-12 w-12 text-fuchsia-400" />
            </div>
            <CardTitle className="text-3xl font-bold text-white">Payment Received!</CardTitle>
            <CardDescription className="text-base mt-2 text-purple-200">
              Your payment is being processed and the merchant will receive their funds shortly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 rounded-xl p-6 border-2 border-fuchsia-400/50">
              <div className="flex items-center justify-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-fuchsia-400" />
                <h3 className="text-lg font-semibold text-white">Cross-Border Conversion</h3>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4 items-center">
                <div className="text-center">
                  <p className="text-sm text-purple-300 mb-1">You Paid</p>
                  <p className="text-3xl font-bold text-white">
                    {formatUSD(paymentResult.amountCharged)}
                  </p>
                  <p className="text-xs text-purple-300 mt-1">USD</p>
                </div>
                
                <div className="flex justify-center">
                  <ArrowRight className="h-6 w-6 text-fuchsia-400" />
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-purple-300 mb-1">Merchant Receives</p>
                  <p className="text-3xl font-bold text-fuchsia-400">
                    {formatMXN(quote.destinationAmountMxn)}
                  </p>
                  <p className="text-xs text-purple-300 mt-1">MXN</p>
                </div>
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-sm text-purple-300">
                  Exchange Rate: <span className="font-semibold text-white">{quote.fxRate.toFixed(2)} MXN/USD</span>
                </p>
              </div>
            </div>

            <div className="space-y-3 border-t border-purple-700 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-purple-300">Transaction ID</span>
                <span className="font-mono text-white">{paymentResult.transactionId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-purple-300">Payment Provider</span>
                <span className="font-semibold text-white">{paymentResult.pspProvider}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-purple-300">PSP Reference</span>
                <span className="font-mono text-xs text-white">{paymentResult.pspReference}</span>
              </div>
            </div>

            <div className="border-t border-purple-700 pt-4 space-y-2">
              <h4 className="text-sm font-semibold text-white mb-2">Fee Breakdown</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-purple-300">Base Amount</span>
                  <span className="text-white">{formatUSD(quote.baseAmount)}</span>
                </div>
                {quote.fees.breakdown.map((fee, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-purple-300">{fee.description}</span>
                    <span className="text-white">{formatUSD(fee.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-semibold pt-2 border-t border-purple-700">
                  <span className="text-white">Total Charged</span>
                  <span className="text-white">{formatUSD(quote.totalAmount)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-fuchsia-950 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-6">
        <Card className="border-purple-700 shadow-lg bg-purple-900/50 backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-10 w-10 rounded-lg bg-fuchsia-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">K</span>
              </div>
              <div>
                <CardTitle className="text-2xl text-white">Kira Checkout</CardTitle>
                <CardDescription className="text-purple-200">Secure payment processing</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePayment} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="customer@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  required
                  disabled={submitting}
                  className="bg-purple-800/50 border-purple-600 text-white placeholder:text-purple-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardNumber" className="text-white">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="4242 4242 4242 4242"
                  value={formatCardNumber(cardNumber)}
                  onChange={handleCardNumberChange}
                  required
                  disabled={submitting}
                  maxLength={19}
                  className="bg-purple-800/50 border-purple-600 text-white placeholder:text-purple-400"
                />
                <p className="text-xs text-purple-300">
                  Test cards: *4242 (success), *4000 (declined), *5000 (network error)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry" className="text-white">Expiry Date</Label>
                  <Input
                    id="expiry"
                    placeholder="MM/YY"
                    value={formatExpiryDate(expiryDate)}
                    onChange={handleExpiryChange}
                    required
                    disabled={submitting}
                    maxLength={5}
                    className="bg-purple-800/50 border-purple-600 text-white placeholder:text-purple-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvc" className="text-white">CVC</Label>
                  <Input
                    id="cvc"
                    placeholder="123"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    required
                    disabled={submitting}
                    maxLength={4}
                    className="bg-purple-800/50 border-purple-600 text-white placeholder:text-purple-400"
                  />
                </div>
              </div>

              {paymentStatus === 'ERROR' && errorMessage && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              {paymentStatus === 'IN_PROGRESS' && (
                <Alert className="border-fuchsia-400/50 bg-fuchsia-500/20">
                  <Loader2 className="h-4 w-4 animate-spin text-fuchsia-400" />
                  <AlertDescription className="text-white">
                    Processing payment... PSP failover may be in progress
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 text-white" 
                size="lg"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Pay {formatUSD(quote.totalAmount)}</>
                )}
              </Button>

              <p className="text-xs text-center text-purple-300">
                Secured by Kira • Your payment information is encrypted
              </p>
            </form>
          </CardContent>
        </Card>

        <Card className="border-purple-700 shadow-lg bg-purple-900/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Order Summary</CardTitle>
            <CardDescription className="text-purple-200">Payment breakdown and conversion details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-purple-300">Base Amount</span>
                <span className="font-semibold text-white">{formatUSD(quote.baseAmount)}</span>
              </div>
              
              {quote.fees.breakdown.map((fee, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-purple-300">{fee.description}</span>
                  <span className="text-white">{formatUSD(fee.amount)}</span>
                </div>
              ))}
              
              <div className="border-t border-purple-700 pt-3 flex justify-between text-lg font-bold">
                <span className="text-white">Total Amount</span>
                <span className="text-fuchsia-400">{formatUSD(quote.totalAmount)}</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 rounded-lg p-4 border border-fuchsia-400/50">
              <h4 className="text-sm font-semibold mb-3 text-white">Merchant Receives</h4>
              <div className="text-center">
                <p className="text-3xl font-bold text-fuchsia-400 mb-1">
                  {formatMXN(quote.destinationAmountMxn)}
                </p>
                <p className="text-xs text-purple-300">
                  At rate: {quote.fxRate.toFixed(2)} MXN per USD
                </p>
              </div>
            </div>

            <div className="border-t border-purple-700 pt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-purple-300">
                <CheckCircle2 className="h-4 w-4 text-fuchsia-400" />
                <span>Secure SSL encryption</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-purple-300">
                <CheckCircle2 className="h-4 w-4 text-fuchsia-400" />
                <span>PCI DSS compliant</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-purple-300">
                <CheckCircle2 className="h-4 w-4 text-fuchsia-400" />
                <span>Automatic failover protection</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
