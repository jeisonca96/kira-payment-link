export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-fuchsia-950 flex items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-6">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-16 w-16 rounded-xl bg-fuchsia-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/50">
            <span className="text-white font-bold text-3xl">K</span>
          </div>
          <h1 className="text-5xl font-bold text-white">Kira Checkout</h1>
        </div>
        
        <p className="text-xl text-purple-200 leading-relaxed">
          Secure payment processing with automatic USD to MXN conversion
        </p>
        
        <div className="bg-purple-900/50 backdrop-blur border border-purple-700 rounded-xl p-8 space-y-4">
          <h2 className="text-2xl font-semibold text-white mb-4">How to Use</h2>
          <div className="text-left space-y-3 text-purple-200">
            <p className="flex items-start gap-3">
              <span className="text-fuchsia-400 font-bold">1.</span>
              Generate a payment link from your backend
            </p>
            <p className="flex items-start gap-3">
              <span className="text-fuchsia-400 font-bold">2.</span>
              Send the link to your customer (format: <code className="text-xs bg-purple-800 px-2 py-1 rounded text-purple-200">/checkout/[linkId]</code>)
            </p>
            <p className="flex items-start gap-3">
              <span className="text-fuchsia-400 font-bold">3.</span>
              Customer completes payment securely
            </p>
            <p className="flex items-start gap-3">
              <span className="text-fuchsia-400 font-bold">4.</span>
              Receive funds in MXN with automatic conversion
            </p>
          </div>
        </div>
        
        <div className="pt-4">
          <p className="text-sm text-purple-400">
            Powered by Kira Financial • PCI DSS Compliant • Multi-PSP Failover
          </p>
        </div>
      </div>
    </div>
  )
}
