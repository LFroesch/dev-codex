import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { csrfFetch } from '../utils/csrf';

interface SupportFormData {
  category: string;
  priority: string;
  subject: string;
  message: string;
}

const SupportForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<SupportFormData>({
    category: '',
    priority: 'medium',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature_request', label: 'Feature Request' },
    { value: 'account', label: 'Account Issues' },
    { value: 'billing', label: 'Billing' },
    { value: 'technical', label: 'Technical Support' },
    { value: 'other', label: 'Other' }
  ];

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await csrfFetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create ticket');
      }

      await response.json();
      setSubmitSuccess(true);
      setFormData({
        category: '',
        priority: 'medium',
        subject: '',
        message: ''
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="card w-full max-w-md bg-base-100 shadow-xl">
          <div className="card-body items-center text-center">
            <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="card-title text-success">Ticket Created Successfully!</h2>
            <p className="text-base-content/70 mb-4">
              Your support request has been submitted. You'll receive a confirmation email shortly.
            </p>
            <div className="card-actions">
              <button 
                className="btn btn-primary" 
                onClick={() => setSubmitSuccess(false)}
              >
                Submit Another Ticket
              </button>
              <button 
                className="btn btn-outline" 
                onClick={() => navigate('/notes')}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="card bg-base-100 shadow-xl border-2 border-base-content/20">
        <div className="card-body">
          <h2 className="card-title text-2xl mb-6">Contact Support</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Selection */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Category *</span>
              </label>
              <select 
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="select select-bordered w-full"
                required
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Selection */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Priority</span>
              </label>
              <select 
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="select select-bordered w-full"
              >
                {priorities.map(priority => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Subject *</span>
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                placeholder="Brief description of your issue"
                className="input input-bordered w-full"
                maxLength={200}
                required
              />
              <label className="label">
                <span className="label-text-alt text-base-content/50">
                  {formData.subject.length}/200 characters
                </span>
              </label>
            </div>

            {/* Message */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Message *</span>
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Please provide detailed information about your issue, including steps to reproduce if applicable..."
                className="textarea textarea-bordered h-32 w-full resize-none"
                maxLength={2000}
                required
              />
              <label className="label">
                <span className="label-text-alt text-base-content/50">
                  {formData.message.length}/2000 characters
                </span>
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="alert alert-error">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="card-actions justify-end pt-4">
              <button 
                type="button"
                className="btn btn-ghost"
                onClick={() => navigate('/notes')}
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || !formData.category || !formData.subject || !formData.message}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Submitting...
                  </>
                ) : (
                  'Submit Ticket'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-8 text-center text-base-content/60">
        <p className="text-sm">
          For urgent issues, please use the "Urgent" priority. We typically respond within 24 hours for most inquiries.
        </p>
      </div>
    </div>
  );
};

export default SupportForm;