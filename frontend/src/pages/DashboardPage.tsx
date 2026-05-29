import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import PaymentModal from '../components/PaymentModal';

function StatusBanner({ status }: { status: any }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const now = new Date();
  const day = now.getDate();

  let variant: 'paid' | 'dueSoon' | 'dueToday' | 'overdue';
  if (status.paid) variant = 'paid';
  else if (day > 1) variant = 'overdue';
  else if (day === 1) variant = 'dueToday';
  else variant = 'dueSoon';

  const styles = {
    paid: 'bg-green-50 border-green-200 text-green-800',
    dueSoon: 'bg-blue-50 border-blue-200 text-blue-800',
    dueToday: 'bg-amber-50 border-amber-200 text-amber-800',
    overdue: 'bg-red-50 border-red-200 text-red-800',
  };

  const icons = {
    paid: '✓',
    dueSoon: '◷',
    dueToday: '!',
    overdue: '⚠',
  };

  return (
    <div className={`border rounded-xl p-4 flex items-start gap-3 ${styles[variant]}`}>
      <span className="text-xl font-bold mt-0.5">{icons[variant]}</span>
      <div>
        <p className="font-semibold text-sm">{t(`dashboard.status.${variant}`)}</p>
        {!status.paid && (
          <p className="text-xs mt-0.5 opacity-75">
            {t('dashboard.monthlyFee')}: ${Number(user?.monthlyFee).toFixed(2)}
          </p>
        )}
      </div>
    </div>
  );
}

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const [showPayment, setShowPayment] = useState(false);
  const MONTHS = i18n.language === 'es' ? MONTHS_ES : MONTHS_EN;

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ['payment-status'],
    queryFn: () => api.get('/payments/status').then((r) => r.data),
  });

  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ['payment-history'],
    queryFn: () => api.get('/payments/history').then((r) => r.data),
  });

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    refetchStatus();
    refetchHistory();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-800 text-lg">Condominio Los Cedros</h1>
            <p className="text-xs text-gray-400">
              {t('dashboard.greeting')}, {user?.firstName} · Apto {user?.apartmentNumber}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {['es', 'en'].map((lng) => (
                <button
                  key={lng}
                  onClick={() => i18n.changeLanguage(lng)}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${i18n.language === lng ? 'bg-[#C0522A] text-white' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {lng.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Status banner */}
        {status && <StatusBanner status={status} />}

        {/* Pay now card */}
        {status && !status.paid && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{t('dashboard.monthlyFee')}</p>
              <p className="text-3xl font-bold text-gray-800">${Number(user?.monthlyFee).toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-1">
                {MONTHS[(status.billingMonth ?? 1) - 1]} {status.billingYear}
              </p>
            </div>
            <button
              onClick={() => setShowPayment(true)}
              className="px-6 py-3 bg-[#C0522A] hover:bg-[#a8461e] text-white font-semibold rounded-xl transition-colors shadow-sm"
            >
              {t('dashboard.payNow')}
            </button>
          </div>
        )}

        {/* Autopay toggle */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-700 text-sm">{t('dashboard.autopay')}</p>
            <p className="text-xs text-gray-400">
              {user?.autopayEnabled ? t('dashboard.autopayEnabled') : t('dashboard.autopayDisabled')}
            </p>
          </div>
          <button
            onClick={() => api.patch('/users/me/autopay', { enabled: !user?.autopayEnabled })}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${user?.autopayEnabled ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-[#C0522A] text-white hover:bg-[#a8461e]'}`}
          >
            {user?.autopayEnabled ? t('dashboard.disableAutopay') : t('dashboard.enableAutopay')}
          </button>
        </div>

        {/* Payment history */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">{t('dashboard.paymentHistory')}</h2>
          {history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">{t('dashboard.noPayments')}</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {history.map((p: any) => (
                <div key={p.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {MONTHS[p.billingMonth - 1]} {p.billingYear}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">
                      {t(`history.methods.${p.method}`)} · {t(`history.statuses.${p.status}`)}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-800">${Number(p.amount).toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showPayment && (
        <PaymentModal onClose={() => setShowPayment(false)} onSuccess={handlePaymentSuccess} />
      )}
    </div>
  );
}
