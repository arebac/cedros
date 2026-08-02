import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

type Method = 'card' | 'ach';

function CheckoutForm({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError('');

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message || t('payment.error'));
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading || !stripe}
          className="flex-1"
        >
          {loading ? t('payment.processing') : t('payment.confirm')}
        </Button>
      </div>
    </form>
  );
}

function PaymentIntent({ method, onSuccess, onClose }: { method: Method; onSuccess: () => void; onClose: () => void }) {
  const { t } = useTranslation();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['payment-intent', method],
    queryFn: () => api.post('/payments/create-intent', { method }, { skipAuthRedirect: true } as any).then((r) => r.data),
    retry: false,
  });

  if (isError) {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          No se pudo iniciar el pago. Revisa que las llaves de Stripe estén correctas y vuelve a intentar.
        </p>
        <Button type="button" variant="outline" onClick={onClose} className="w-full">
          Cerrar
        </Button>
      </div>
    );
  }

  if (isLoading || !data) {
    return <div className="py-8 text-center text-muted-foreground text-sm">Cargando...</div>;
  }

  return (
    <div>
      {/* Fee breakdown */}
      <div className="bg-muted/60 rounded-lg p-4 mb-5 space-y-2 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>{t('payment.baseFee')}</span>
          <span>${data.baseAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>{t('payment.processingFee')}</span>
          <span>${data.fee.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-semibold text-foreground border-t border-border pt-2">
          <span>{t('payment.total')}</span>
          <span>${data.total.toFixed(2)}</span>
        </div>
        <p className="text-xs text-muted-foreground">{t('payment.feeDisclosure')}</p>
      </div>

      <Elements stripe={stripePromise} options={{ clientSecret: data.clientSecret }}>
        <CheckoutForm onSuccess={onSuccess} onClose={onClose} />
      </Elements>
    </div>
  );
}

export default function PaymentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [method, setMethod] = useState<Method>('card');
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card text-card-foreground rounded-lg w-full max-w-md shadow-2xl border border-border">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-foreground">{t('payment.title')}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>

        <div className="p-6">
          {!confirmed ? (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium text-foreground mb-3">{t('payment.method')}</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['card', 'ach'] as Method[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all ${method === m ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-ring hover:text-foreground'}`}
                    >
                      {t(`payment.${m}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-muted/60 rounded-lg p-4 text-sm text-muted-foreground">
                <p>{t('dashboard.monthlyFee')}: <strong>${Number(user?.monthlyFee).toFixed(2)}</strong></p>
                <p className="text-xs text-muted-foreground mt-1">{t('payment.feeDisclosure')}</p>
              </div>

              <Button
                type="button"
                onClick={() => setConfirmed(true)}
                className="w-full"
              >
                Continuar →
              </Button>
            </div>
          ) : (
            <PaymentIntent method={method} onSuccess={onSuccess} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}
