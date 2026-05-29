import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useQuery } from '@tanstack/react-query';
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
      {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !stripe}
          className="flex-1 py-2.5 bg-[#C0522A] hover:bg-[#a8461e] disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors"
        >
          {loading ? t('payment.processing') : t('payment.confirm')}
        </button>
      </div>
    </form>
  );
}

function PaymentIntent({ method, onSuccess, onClose }: { method: Method; onSuccess: () => void; onClose: () => void }) {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['payment-intent', method],
    queryFn: () => api.post('/payments/create-intent', { method }).then((r) => r.data),
  });

  if (isLoading || !data) {
    return <div className="py-8 text-center text-gray-400 text-sm">Cargando...</div>;
  }

  return (
    <div>
      {/* Fee breakdown */}
      <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>{t('payment.baseFee')}</span>
          <span>${data.baseAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>{t('payment.processingFee')}</span>
          <span>${data.fee.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-semibold text-gray-800 border-t border-gray-200 pt-2">
          <span>{t('payment.total')}</span>
          <span>${data.total.toFixed(2)}</span>
        </div>
        <p className="text-xs text-gray-400">{t('payment.feeDisclosure')}</p>
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
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800">{t('payment.title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-6">
          {!confirmed ? (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">{t('payment.method')}</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['card', 'ach'] as Method[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${method === m ? 'border-[#C0522A] bg-[#C0522A]/5 text-[#C0522A]' : 'border-gray-100 text-gray-600 hover:border-gray-200'}`}
                    >
                      {t(`payment.${m}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
                <p>{t('dashboard.monthlyFee')}: <strong>${Number(user?.monthlyFee).toFixed(2)}</strong></p>
                <p className="text-xs text-gray-400 mt-1">{t('payment.feeDisclosure')}</p>
              </div>

              <button
                onClick={() => setConfirmed(true)}
                className="w-full py-2.5 bg-[#C0522A] hover:bg-[#a8461e] text-white font-semibold rounded-lg transition-colors"
              >
                Continuar →
              </button>
            </div>
          ) : (
            <PaymentIntent method={method} onSuccess={onSuccess} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}
