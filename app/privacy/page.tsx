export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mt-4 text-sm leading-7 text-gray-700">
          This policy explains how Interrogo AI collects and processes personal data when you use the
          platform.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-gray-900">Data We Process</h2>
        <p className="mt-3 text-sm leading-7 text-gray-700">
          We process account data (email, profile information), session content (study materials,
          prompts, responses), and operational logs required for security and reliability.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-gray-900">Purpose of Processing</h2>
        <p className="mt-3 text-sm leading-7 text-gray-700">
          Data is processed to authenticate users, deliver AI exam sessions, calculate analytics,
          enforce plan limits, and maintain billing/subscription operations.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-gray-900">Data Sharing</h2>
        <p className="mt-3 text-sm leading-7 text-gray-700">
          We do not sell personal data. We use trusted infrastructure and payment providers only to
          deliver the service (for example, hosting, database, and billing processors).
        </p>

        <h2 className="mt-6 text-lg font-semibold text-gray-900">Retention and Deletion</h2>
        <p className="mt-3 text-sm leading-7 text-gray-700">
          Session and account data are retained only as needed for service delivery and legal
          obligations. You can request export or deletion of your account data using the in-app
          account controls when available.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-gray-900">Your Rights</h2>
        <p className="mt-3 text-sm leading-7 text-gray-700">
          Depending on your jurisdiction, you may have rights to access, correct, export, or delete
          your personal data.
        </p>

        <p className="mt-6 text-xs text-gray-500">Last updated: 2026-04-07</p>
      </div>
    </main>
  );
}
