import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const TermsPage: React.FC = () => {
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

        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-base-content/60 text-sm mb-8">Last updated: April 27, 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-base-content/80">
          <section>
            <h2 className="text-xl font-semibold mb-2">Acceptance</h2>
            <p>
              By using dev-codex.com you agree to these terms. If you do not agree,
              do not use the service. These terms apply to the hosted service at
              dev-codex.com — self-hosted deployments are governed by their
              operator.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Accounts</h2>
            <p>
              You're responsible for keeping your credentials secure and for all
              activity under your account. You must be at least 13 years old to use
              the service. One person, one account — don't share accounts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Plans and billing</h2>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Free:</strong> 3 projects, 3 AI queries/day, limited content per project.</li>
              <li><strong>Pro ($5/mo):</strong> 20 projects, 500k AI tokens/month, higher per-project limits.</li>
              <li><strong>Premium ($15/mo):</strong> unlimited projects, 2M AI tokens/month, unlimited content.</li>
            </ul>
            <p className="mt-2">
              Paid plans are billed monthly via Stripe and renew automatically until
              canceled. You can cancel from the Billing page; access continues
              through the end of the paid period. Refunds are at our discretion.
              Prices may change with notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Use the service for illegal activity or to harm others.</li>
              <li>Attempt to break, probe, or overload the service.</li>
              <li>Abuse the AI assistant (spam, scraping, prompt injection, attempting to extract system prompts).</li>
              <li>Resell access or share accounts.</li>
              <li>Upload content you don't have rights to.</li>
              <li>Use the service to generate or distribute malware, harassment, or content that violates Google's Gemini API usage policies.</li>
            </ul>
            <p className="mt-2">
              We may suspend or terminate accounts that violate these rules.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Your content</h2>
            <p>
              You own the content you create (projects, notes, todos, etc.). You
              grant us a limited license to store, process, and display that content
              solely to operate the service. We don't use your content to train AI
              models.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">AI features</h2>
            <p>
              The AI assistant uses third-party language models (Google Gemini in
              production). AI output may be inaccurate or incomplete — verify before
              relying on it. AI features are subject to rate limits and monthly
              token caps based on your plan. We may change models, limits, or
              behavior over time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Service availability</h2>
            <p>
              The service is provided "as is" without warranties. We don't guarantee
              uptime, data permanence, or that any feature will continue to exist.
              Back up anything you can't afford to lose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Termination</h2>
            <p>
              You can delete your account at any time from Account Settings. We may
              suspend or terminate accounts for violations of these terms, abuse, or
              non-payment. On termination, your data may be deleted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Liability</h2>
            <p>
              To the fullest extent permitted by law, our liability is limited to
              the amount you paid us in the 12 months prior to the claim. We are not
              liable for indirect, incidental, or consequential damages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Changes</h2>
            <p>
              We may update these terms. Continued use after changes means you
              accept them. Material changes will be announced.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
