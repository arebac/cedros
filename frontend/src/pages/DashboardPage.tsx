import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bell, CalendarDays, CheckCircle2, Clock3, CreditCard, FileText, Home, Languages, LogOut, Mail, Phone, Save, UserRound, WalletCards } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import PaymentModal from '../components/PaymentModal';

type DashboardTab = 'announcements' | 'payment' | 'history' | 'profile';

type ResidentProfile = {
  email?: string;
  apartmentNumber?: string;
  phone?: string | null;
  language?: 'es' | 'en';
};

function StatusBanner({ status }: { status: any }) {
  const { t } = useTranslation();
  const now = new Date();
  const day = now.getDate();

  let variant: 'paid' | 'dueSoon' | 'dueToday' | 'overdue';
  if (status.paid) variant = 'paid';
  else if (day > 1) variant = 'overdue';
  else if (day === 1) variant = 'dueToday';
  else variant = 'dueSoon';

  const styles = {
    paid: 'border-primary/20 bg-primary/10 text-primary',
    dueSoon: 'border-border bg-muted/70 text-foreground',
    dueToday: 'border-primary/30 bg-primary/10 text-primary',
    overdue: 'border-destructive/30 bg-destructive/10 text-destructive',
  };

  const icons = {
    paid: CheckCircle2,
    dueSoon: Clock3,
    dueToday: CalendarDays,
    overdue: Clock3,
  };

  const Icon = icons[variant];

  return (
    <div className={`border rounded-lg p-4 flex items-start gap-3 ${styles[variant]}`}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-semibold text-sm">{t(`dashboard.status.${variant}`)}</p>
      </div>
    </div>
  );
}

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function formatPaymentDate(value: string | Date | undefined, language: string) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(language === 'es' ? 'es-PR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

type Announcement = {
  id: string;
  createdAt: string;
  titleEs: string;
  titleEn: string;
  bodyEs: string;
  bodyEn: string;
};

function AnnouncementsPanel({ announcements }: { announcements: Announcement[] }) {
  const { i18n } = useTranslation();
  const MONTHS = i18n.language === 'es' ? MONTHS_ES : MONTHS_EN;
  const isSpanish = i18n.language === 'es';

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {isSpanish ? 'Avisos' : 'Announcements'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSpanish ? 'Lo importante del condominio, en un solo lugar.' : 'Everything important from the condominium in one place.'}
          </p>
        </div>
        {announcements.length > 0 && (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {announcements.length}
          </span>
        )}
      </div>

      {announcements.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
          <Bell className="mx-auto size-5 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">
            {isSpanish ? 'No hay avisos publicados.' : 'No announcements posted.'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSpanish ? 'Cuando la administración publique algo, aparecerá aquí.' : 'When administration posts something, it will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => {
            const date = new Date(announcement.createdAt);
            const dateStr = `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;

            return (
              <article key={announcement.id} className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {isSpanish ? announcement.titleEs : announcement.titleEn}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {isSpanish ? announcement.bodyEs : announcement.bodyEn}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground sm:text-right">{dateStr}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function PaymentsPanel({
  status,
  onPay,
}: {
  status: any;
  onPay: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const MONTHS = i18n.language === 'es' ? MONTHS_ES : MONTHS_EN;
  const isSpanish = i18n.language === 'es';

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          {isSpanish ? 'Pagos' : 'Payments'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSpanish ? 'Tu cuota mensual y pago automático.' : 'Your monthly fee and autopay.'}
        </p>
      </div>

      {status && <StatusBanner status={status} />}

      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('dashboard.monthlyFee')}</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-foreground">
              ${Number(user?.monthlyFee).toFixed(2)}
            </p>
            {status && (
              <p className="mt-1 text-xs text-muted-foreground">
                {MONTHS[(status.billingMonth ?? 1) - 1]} {status.billingYear}
              </p>
            )}
          </div>
          <WalletCards className="size-5 text-muted-foreground" />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            onClick={onPay}
            disabled={Boolean(status?.paid)}
            className="h-11 w-full"
          >
            <CreditCard className="size-4" />
            {status?.paid ? (isSpanish ? 'Pagado' : 'Paid') : t('dashboard.payNow')}
          </Button>
          <Button
            type="button"
            variant={user?.autopayEnabled ? 'secondary' : 'outline'}
            onClick={() => api.patch('/users/me/autopay', { enabled: !user?.autopayEnabled })}
            className="h-11 w-full"
          >
            {user?.autopayEnabled ? t('dashboard.disableAutopay') : t('dashboard.enableAutopay')}
          </Button>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">{t('dashboard.autopay')}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {user?.autopayEnabled ? t('dashboard.autopayEnabled') : t('dashboard.autopayDisabled')}
            </p>
          </div>
          <span className={`h-2.5 w-2.5 rounded-full ${user?.autopayEnabled ? 'bg-primary' : 'bg-muted-foreground/50'}`} />
        </div>
      </div>
    </section>
  );
}

function PaymentHistoryPanel({ history }: { history: any[] }) {
  const { t, i18n } = useTranslation();
  const MONTHS = i18n.language === 'es' ? MONTHS_ES : MONTHS_EN;
  const isSpanish = i18n.language === 'es';

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          {isSpanish ? 'Historial' : 'History'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSpanish ? 'Pagos registrados en tu cuenta.' : 'Payments recorded on your account.'}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">{t('dashboard.paymentHistory')}</h3>
        </div>
        {history.length === 0 ? (
          <p className="rounded-lg bg-muted/50 py-6 text-center text-sm text-muted-foreground">
            {t('dashboard.noPayments')}
          </p>
        ) : (
          <div className="divide-y divide-border">
            {history.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {formatPaymentDate(p.createdAt, i18n.language)}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {MONTHS[p.billingMonth - 1]} {p.billingYear} · {t(`history.methods.${p.method}`)} · {t(`history.statuses.${p.status}`)}
                  </p>
                </div>
                <p className="font-semibold text-foreground">${Number(p.amount).toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ProfilePanel({ user }: { user: ResidentProfile | null }) {
  const { i18n } = useTranslation();
  const isSpanish = i18n.language === 'es';
  const [form, setForm] = useState({
    phone: user?.phone ?? '',
    language: user?.language ?? 'es',
  });

  const updateProfile = useMutation({
    mutationFn: (data: typeof form) => api.patch<ResidentProfile>('/users/me', data).then((r) => r.data),
    onSuccess: (updated) => {
      const language = updated.language ?? form.language;
      setForm({
        phone: updated.phone ?? '',
        language,
      });
      i18n.changeLanguage(language);
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateProfile.mutate(form);
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          {isSpanish ? 'Perfil' : 'Profile'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSpanish ? 'Tu información de residente.' : 'Your resident information.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Home className="size-3.5" />
              {isSpanish ? 'Apartamento' : 'Apartment'}
            </label>
            <input
              value={user?.apartmentNumber ?? ''}
              readOnly
              className="w-full rounded-md border border-input bg-muted/60 px-3 py-2 text-sm text-muted-foreground"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Mail className="size-3.5" />
              Email
            </label>
            <input
              value={user?.email ?? ''}
              readOnly
              className="w-full rounded-md border border-input bg-muted/60 px-3 py-2 text-sm text-muted-foreground"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Phone className="size-3.5" />
              {isSpanish ? 'Teléfono' : 'Phone'}
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              className="w-full rounded-md border border-input bg-muted/60 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Languages className="size-3.5" />
              {isSpanish ? 'Idioma preferido' : 'Preferred language'}
            </label>
            <select
              value={form.language}
              onChange={(event) => setForm({ ...form, language: event.target.value as 'es' | 'en' })}
              className="w-full rounded-md border border-input bg-muted/60 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        {updateProfile.isSuccess && (
          <p className="mt-4 text-sm text-primary">
            {isSpanish ? 'Perfil actualizado.' : 'Profile updated.'}
          </p>
        )}
        {updateProfile.isError && (
          <p className="mt-4 text-sm text-destructive">
            {isSpanish ? 'No se pudo actualizar el perfil.' : 'Could not update profile.'}
          </p>
        )}

        <div className="mt-5 flex justify-end">
          <Button type="submit" disabled={updateProfile.isPending} className="h-10">
            <Save className="size-4" />
            {updateProfile.isPending ? (isSpanish ? 'Guardando...' : 'Saving...') : (isSpanish ? 'Guardar' : 'Save')}
          </Button>
        </div>
      </form>
    </section>
  );
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const [showPayment, setShowPayment] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('announcements');

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ['payment-status'],
    queryFn: () => api.get('/payments/status').then((r) => r.data),
  });

  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ['payment-history'],
    queryFn: () => api.get('/payments/history').then((r) => r.data),
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.get<Announcement[]>('/announcements').then((r) => r.data),
  });

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    refetchStatus();
    refetchHistory();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/80 bg-card/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/condominio_los_cedros_no_background.png"
              alt="Condominio Los Cedros"
              className="size-11 shrink-0 object-contain"
            />
            <p className="truncate text-sm text-muted-foreground">
              {t('dashboard.greeting')}, <span className="font-medium text-foreground">{user?.firstName}</span> · Apto {user?.apartmentNumber}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden gap-1 rounded-md border border-border bg-background/60 p-1 sm:flex">
              {['es', 'en'].map((lng) => (
                <Button
                  key={lng}
                  type="button"
                  variant={i18n.language === lng ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => i18n.changeLanguage(lng)}
                  className="h-7 px-2 text-xs"
                >
                  {lng.toUpperCase()}
                </Button>
              ))}
            </div>
            <ModeToggle />
            <Button type="button" variant="ghost" size="icon" onClick={logout} title={t('nav.logout')}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6 grid grid-cols-2 rounded-lg border border-border bg-card p-1 shadow-sm sm:grid-cols-4">
          {[
            { id: 'announcements' as const, label: i18n.language === 'es' ? 'Avisos' : 'Announcements', icon: Bell },
            { id: 'payment' as const, label: i18n.language === 'es' ? 'Pago' : 'Payment', icon: CreditCard },
            { id: 'history' as const, label: i18n.language === 'es' ? 'Historial' : 'History', icon: FileText },
            { id: 'profile' as const, label: i18n.language === 'es' ? 'Perfil' : 'Profile', icon: UserRound },
          ].map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex h-10 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors ${
                  selected
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                }`}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'announcements' && <AnnouncementsPanel announcements={announcements} />}
        {activeTab === 'payment' && <PaymentsPanel status={status} onPay={() => setShowPayment(true)} />}
        {activeTab === 'history' && <PaymentHistoryPanel history={history} />}
        {activeTab === 'profile' && <ProfilePanel user={user as ResidentProfile | null} />}
      </main>

      {showPayment && (
        <PaymentModal onClose={() => setShowPayment(false)} onSuccess={handlePaymentSuccess} />
      )}
    </div>
  );
}
