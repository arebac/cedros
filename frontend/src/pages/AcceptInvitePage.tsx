import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';

export default function AcceptInvitePage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [info, setInfo] = useState<{ email: string; firstName: string; apartmentNumber: string } | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) { setInvalid(true); return; }
    api.get(`/auth/validate-invite?token=${token}`)
      .then((r) => setInfo(r.data))
      .catch(() => setInvalid(true));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError(t('auth.passwordTooShort')); return; }
    if (password !== confirm) { setError(t('auth.passwordMismatch')); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/accept-invite', { token, password });
      localStorage.setItem('token', data.token);
      navigate('/dashboard');
    } catch {
      setError(t('auth.inviteExpired'));
    } finally {
      setLoading(false);
    }
  };

  if (invalid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-8 max-w-md w-full text-center">
          <p className="text-red-600 font-medium">{t('auth.inviteExpired')}</p>
          <a href="/" className="mt-4 inline-block text-sm text-gray-500 hover:text-gray-700">
            ← Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Condominio Los Cedros</h1>
          <p className="text-gray-500 mt-1 text-sm">{t('auth.activateAccount')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="mb-6 bg-amber-50 border border-amber-100 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              {t('auth.welcome')}, <strong>{info.firstName}</strong>
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              {info.email} · Apto {info.apartmentNumber}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.setPassword')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C0522A]/30 focus:border-[#C0522A] transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.confirmPassword')}
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C0522A]/30 focus:border-[#C0522A] transition"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#C0522A] hover:bg-[#a8461e] disabled:opacity-60 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? '...' : t('auth.activateAccount')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
