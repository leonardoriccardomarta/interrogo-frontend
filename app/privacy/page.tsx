export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mt-4 text-sm leading-7 text-gray-700">
          Interrogo AI uses your account details and study interactions only to provide the service,
          secure access, and improve learning features.
        </p>
        <p className="mt-3 text-sm leading-7 text-gray-700">
          We do not sell personal data. You can request account data deletion at any time by
          contacting support.
        </p>
        <p className="mt-3 text-sm leading-7 text-gray-700">
          By using this platform, you agree that data may be processed to run authentication,
          save sessions, and generate AI responses.
        </p>
      </div>
    </main>
  );
}
