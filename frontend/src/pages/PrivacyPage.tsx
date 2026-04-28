import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const PrivacyPage: React.FC = () => {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'retro';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return (
    <div className="min-h-screen bg-base-100 px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <Link to="/login" className="text-sm link link-primary mb-6 inline-block">
          ← Back to login
        </Link>

        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-base-content/60 text-sm mb-8">Last updated: April 27, 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-base-content/80">
          <section>
            <h2 className="text-xl font-semibold mb-2">Who we are</h2>
            <p>
              Dev Codex is a project management application operated as an indie
              project. This policy explains what we collect when you use
              dev-codex.com and how we use it. Questions: contact the support email
              listed on the consent screen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">What we collect</h2>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Account info:</strong> email, name, hashed password (or Google account ID if you sign in with Google).</li>
              <li><strong>Project data:</strong> projects, todos, notes, devlog entries, features, and other content you create.</li>
              <li><strong>AI usage:</strong> the prompts you send to the AI assistant, monthly token counts, and per-day query counts (used for rate limiting and billing).</li>
              <li><strong>Billing:</strong> if you subscribe to Pro or Premium, Stripe handles payment. We store a Stripe customer ID and subscription status; we do not store your card details.</li>
              <li><strong>Analytics:</strong> basic page views, feature usage, and error logs to improve the product.</li>
              <li><strong>Demo mode:</strong> if you use the demo, we record your IP address to enforce per-IP query limits. Demo data resets on each demo login.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">How we use it</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>To provide the service: store your projects, authenticate you, run AI queries.</li>
              <li>To enforce plan limits (queries/day, tokens/month, project counts).</li>
              <li>To process payments via Stripe.</li>
              <li>To respond to support requests.</li>
              <li>To investigate bugs, abuse, and security issues.</li>
            </ul>
            <p className="mt-2">
              We do not sell your data. We do not use your project content to train
              models.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Third parties we share data with</h2>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Google:</strong> if you sign in with Google, your email and basic profile are received from Google. The OAuth scopes requested are <code>profile</code> and <code>email</code> only.</li>
              <li><strong>Google (Gemini API):</strong> when you use the AI assistant, your prompt and relevant project context are sent to the Gemini API to generate a response. Google's API terms apply.</li>
              <li><strong>Stripe:</strong> processes subscription payments. See Stripe's privacy policy.</li>
              <li><strong>MongoDB Atlas:</strong> hosts the database storing your account and project data.</li>
              <li><strong>Hosting provider:</strong> the application is hosted on DigitalOcean.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Self-hosted deployments</h2>
            <p>
              Dev Codex is open source and can be self-hosted. If you use a
              self-hosted deployment, this policy does not apply — the operator of
              that deployment controls your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Your rights</h2>
            <p>
              You can delete your account from the Account Settings page, which
              removes your account and project data. You can request a copy of your
              data by contacting support. You can revoke Google account linking from
              the same page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Cookies</h2>
            <p>
              We use a session cookie to keep you logged in and local storage for
              UI preferences (theme, etc.). We do not use third-party advertising
              cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Changes</h2>
            <p>
              We may update this policy. Material changes will be announced on the
              site or via email.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
