export const metadata = {
  title: 'Terms of Service | Daily Health',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl w-full bg-white shadow rounded-lg p-8 space-y-6 text-gray-800">
        <h1 className="text-3xl font-bold text-gray-900 border-b pb-4">Terms of Service</h1>
        
        <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">1. Acceptance of Terms</h2>
          <p>
            By accessing and using Daily Health, you accept and agree to be bound by the terms and provision of this agreement.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">2. Description of Service</h2>
          <p>
            Daily Health is a personal health tracking application that allows users to log food, water, weight, and receive AI-generated insights. 
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">3. Medical Disclaimer</h2>
          <p>
            <strong>Not Medical Advice:</strong> The information provided by Daily Health, including any AI-generated advice or analysis, is for informational purposes only and is not intended as a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">4. User Accounts and Google Login</h2>
          <p>
            To use certain features, you must log in using your Google account. You are responsible for maintaining the confidentiality of your account information. We reserve the right to terminate accounts at our sole discretion.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">5. Limitation of Liability</h2>
          <p>
            Daily Health and its creators shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your access to or use of, or inability to access or use, the services.
          </p>
        </section>
      </div>
    </div>
  );
}
