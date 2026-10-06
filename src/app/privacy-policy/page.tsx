export const metadata = {
  title: 'Privacy Policy | Daily Health',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl w-full bg-white shadow rounded-lg p-8 space-y-6 text-gray-800">
        <h1 className="text-3xl font-bold text-gray-900 border-b pb-4">Privacy Policy</h1>
        
        <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">1. Introduction</h2>
          <p>
            Welcome to Daily Health. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our application.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">2. Information We Collect</h2>
          <p>
            <strong>Google Account Information:</strong> We use Google OAuth to authenticate users. We collect your basic profile information (name, email) provided by Google solely for creating and managing your account.
          </p>
          <p>
            <strong>Health Data:</strong> Any health, nutrition, or physical data you input into the app (e.g., weight, food logs, water intake) is securely stored and associated with your account.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">3. Google Drive Integration</h2>
          <p>
            If you enable the Google Drive backup feature, our application requests access to your Google Drive to create, read, and update a specific backup folder solely for your Daily Health data. We do not access, read, or modify any other files in your Google Drive.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">4. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide and maintain our service</li>
            <li>To authenticate your identity using Google Login</li>
            <li>To generate personalized health advice via AI services based on your inputs</li>
            <li>To allow you to backup and restore your own data</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">5. Data Sharing</h2>
          <p>
            We do not sell, trade, or rent your personal identification information to others. Your health data may be sent to third-party AI providers strictly for generating the advice and analysis requested by you within the app.
          </p>
        </section>
      </div>
    </div>
  );
}
