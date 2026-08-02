import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
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
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="absolute right-5 top-5">
          <ModeToggle />
        </div>
        <div className="bg-card rounded-lg shadow-sm border border-border p-8 max-w-md w-full text-center">
          <p className="text-destructive font-medium">{t('auth.inviteExpired')}</p>
          <a href="/" className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground">
            ← Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="absolute right-5 top-5">
        <ModeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center">
          <img
            src="/condominio_los_cedros_no_background.png"
            alt="Condominio Los Cedros"
            className="mb-4 h-28 w-auto"
          />
          <p className="text-muted-foreground mt-1 text-sm">{t('auth.activateAccount')}</p>
        </div>

        <div className="bg-card rounded-lg shadow-sm border border-border p-8">
          <div className="mb-6 bg-muted/60 border border-border rounded-md p-4">
            <p className="text-sm text-foreground">
              {t('auth.welcome')}, <strong>{info.firstName}</strong>
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {info.email} · Apto {info.apartmentNumber}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('auth.setPassword')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2.5 border border-input bg-muted/60 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('auth.confirmPassword')}
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-input bg-muted/60 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? '...' : t('auth.activateAccount')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
