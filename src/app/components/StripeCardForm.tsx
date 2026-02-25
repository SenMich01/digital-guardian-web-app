import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { billingApi } from '@/lib/api';

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'
);

function CardFormInner({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/settings?card_saved=true`,
        },
      });
      if (error) throw error;
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      <Button type="submit" disabled={!stripe || loading}>
        {loading ? 'Saving...' : 'Save Card'}
      </Button>
    </form>
  );
}

export function StripeCardForm({ clientSecret, onSuccess }: {
  clientSecret: string | null;
  onSuccess: () => void;
}) {
  if (!clientSecret) {
    return (
      <div className="text-sm text-gray-500">
        Click "Add payment method" to add a card securely.
      </div>
    );
  }
  const options = { clientSecret, appearance: { theme: 'stripe' as const } };
  return (
    <Elements stripe={stripePromise} options={options}>
      <CardFormInner onSuccess={onSuccess} />
    </Elements>
  );
}
