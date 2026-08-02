import { Globe2, LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const lang = i18n.language === 'en' ? 'en' : 'es';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch {
      setError(t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-5 py-10 text-foreground">
      <div className="absolute right-5 top-5 z-10 flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-md border bg-background/80 p-1 shadow-sm backdrop-blur">
          <Globe2 className="mx-2 size-4 text-muted-foreground" aria-hidden="true" />
          {(['es', 'en'] as const).map((lng) => (
            <Button
              key={lng}
              type="button"
              variant={lang === lng ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => i18n.changeLanguage(lng)}
              className="h-7 px-2"
            >
              {lng.toUpperCase()}
            </Button>
          ))}
        </div>
        <ModeToggle />
      </div>

      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,250,235,0.24),transparent_38%)] dark:bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.05),transparent_34%)]" />

      <main className="w-full max-w-md">
        <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="border-b bg-muted/30 px-8 pb-7 pt-8 text-center">
            <img
              src="/condominio_los_cedros_no_background.png"
              alt="Condominio Los Cedros"
              className="mx-auto h-36 w-auto"
            />
            <div className="mt-5 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
              <LockKeyhole className="size-4" aria-hidden="true" />
              <span>{lang === 'es' ? 'Acceso privado' : 'Private access'}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 px-8 py-7">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 w-full rounded-md border bg-muted/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                {t('auth.password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11 w-full rounded-md border bg-muted/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>

            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="h-11 w-full">
              {loading ? '...' : t('auth.login')}
            </Button>
          </form>
        </section>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          {lang === 'es' ? 'Solo residentes y administradores autorizados.' : 'Authorized residents and administrators only.'}
        </p>
      </main>
    </div>
  );
}
