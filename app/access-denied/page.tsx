export default function AccessDeniedPage() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-8">
      <div className="max-w-md text-center">
        <div className="text-5xl font-semibold text-gray-900 mb-4">403</div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 text-sm">
          Your IP address is not authorized to access this application.
        </p>
      </div>
    </main>
  )
}
