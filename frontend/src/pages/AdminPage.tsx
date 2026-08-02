import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

type Tab = 'overview' | 'residents' | 'email' | 'announcements' | 'quickbooks';

type AnnouncementForm = {
  titleEs: string;
  titleEn: string;
  bodyEs: string;
  bodyEn: string;
};

type QuickBooksCustomer = {
  id: string;
  displayName: string;
  email?: string;
  active?: boolean;
};

const emptyAnnouncementForm: AnnouncementForm = { titleEs: '', titleEn: '', bodyEs: '', bodyEn: '' };

function formatPaymentDate(value: string | Date | undefined, language: string) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(language === 'es' ? 'es-PR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function StatusBadge({ paid, isActive }: { paid: boolean; isActive: boolean }) {
  if (!isActive) return <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Sin activar</span>;
  return paid
    ? <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-full">Al día</span>
    : <span className="text-xs bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 px-2 py-0.5 rounded-full">Pendiente</span>;
}

function OverviewTab() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => api.get('/admin/overview').then((r) => r.data),
  });

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t('admin.totalUnits'), value: data.total, color: 'text-foreground' },
          { label: t('admin.paid'), value: data.paid, color: 'text-emerald-700 dark:text-emerald-300' },
          { label: t('admin.unpaid'), value: data.unpaid, color: 'text-red-700 dark:text-red-300' },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-lg border border-border p-4 text-center shadow-sm">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">{t('admin.residents')}</h3>
        </div>
        <div className="divide-y divide-border">
          {data.residents.map((r: any) => (
            <div key={r.id} className="px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  {r.apartmentNumber}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{r.fullName}</p>
                  <p className="text-xs text-muted-foreground">{r.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">${Number(r.monthlyFee).toFixed(2)}</p>
                <StatusBadge paid={r.paid} isActive={r.isActive} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResidentsTab() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', apartmentNumber: '', phone: '', moveInDate: '', language: 'es' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [manualForm, setManualForm] = useState(() => {
    const now = new Date();
    return { notes: '', billingMonth: now.getMonth() + 1, billingYear: now.getFullYear() };
  });
  const isSpanish = i18n.language === 'es';
  const MONTHS = isSpanish
    ? ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const { data: residents = [], isLoading } = useQuery({
    queryKey: ['admin-residents'],
    queryFn: () => api.get('/admin/residents').then((r) => r.data),
  });

  const { data: overview } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => api.get('/admin/overview').then((r) => r.data),
  });

  const selectedResident = residents.find((r: any) => r.id === selectedId) ?? residents[0];
  const selectedStatus = overview?.residents?.find((r: any) => r.id === selectedResident?.id);

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['admin-resident-payments', selectedResident?.id],
    queryFn: () => api.get(`/admin/residents/${selectedResident.id}/payments`).then((r) => r.data),
    enabled: Boolean(selectedResident?.id),
  });

  const create = useMutation({
    mutationFn: (data: typeof form) => api.post('/admin/residents', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-residents'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
      setShowForm(false);
      setForm({ firstName: '', lastName: '', email: '', apartmentNumber: '', phone: '', moveInDate: '', language: 'es' });
    },
  });

  const resend = useMutation({
    mutationFn: (id: string) => api.post(`/admin/residents/${id}/resend-invite`),
  });

  const recordManualPayment = useMutation({
    mutationFn: () => api.post('/admin/payments/manual', {
      userId: selectedResident.id,
      notes: manualForm.notes,
      billingMonth: Number(manualForm.billingMonth),
      billingYear: Number(manualForm.billingYear),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
      qc.invalidateQueries({ queryKey: ['admin-resident-payments', selectedResident.id] });
      setManualForm((current) => ({ ...current, notes: '' }));
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setShowForm(!showForm)}>
          {t('admin.addResident')}
        </Button>
      </div>

      {showForm && (
        <div className="bg-card rounded-lg border border-border p-5 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4 text-sm">{t('admin.addResident')}</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'firstName', label: t('admin.fields.firstName') },
              { key: 'lastName', label: t('admin.fields.lastName') },
              { key: 'email', label: t('admin.fields.email') },
              { key: 'apartmentNumber', label: t('admin.fields.apartment') },
              { key: 'phone', label: t('admin.fields.phone') },
              { key: 'moveInDate', label: t('admin.fields.moveInDate'), type: 'date' },
            ].map(({ key, label, type = 'text' }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
                <input
                  type={type}
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full px-3 py-2 border border-input bg-muted/60 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{t('admin.fields.language')}</label>
              <select
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                className="w-full px-3 py-2 border border-input bg-muted/60 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => create.mutate(form)}
              disabled={create.isPending}
              className="flex-1"
            >
              {create.isPending ? '...' : 'Guardar y enviar invitación'}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Cargando...</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
          <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
            <div className="divide-y divide-border">
              {residents.map((r: any) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors ${selectedResident?.id === r.id ? 'bg-muted' : 'hover:bg-muted/50'}`}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.firstName} {r.lastName} <span className="text-muted-foreground font-normal">· Apto {r.apartmentNumber}</span></p>
                    <p className="text-xs text-muted-foreground">{r.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!r.isActive && (
                      <span className="text-xs text-primary">
                        {t('admin.resendInvite')}
                      </span>
                    )}
                    <StatusBadge paid={Boolean(overview?.residents?.find((s: any) => s.id === r.id)?.paid)} isActive={r.isActive} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {selectedResident ? (
              <>
                <div className="bg-card rounded-lg border border-border p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">{isSpanish ? 'Perfil' : 'Profile'}</p>
                      <h3 className="mt-1 text-lg font-semibold text-foreground">{selectedResident.firstName} {selectedResident.lastName}</h3>
                      <p className="text-sm text-muted-foreground">Apto {selectedResident.apartmentNumber}</p>
                    </div>
                    <StatusBadge paid={Boolean(selectedStatus?.paid)} isActive={selectedResident.isActive} />
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">{t('admin.fields.email')}</p>
                      <p className="mt-0.5 break-words text-foreground">{selectedResident.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('admin.fields.phone')}</p>
                      <p className="mt-0.5 text-foreground">{selectedResident.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('dashboard.monthlyFee')}</p>
                      <p className="mt-0.5 font-semibold text-foreground">${Number(selectedResident.monthlyFee).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{isSpanish ? 'Balance actual' : 'Current balance'}</p>
                      <p className="mt-0.5 font-semibold text-foreground">${Number(selectedStatus?.balance ?? selectedResident.monthlyFee).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('admin.fields.language')}</p>
                      <p className="mt-0.5 text-foreground">{selectedResident.language === 'en' ? 'English' : 'Español'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('admin.fields.moveInDate')}</p>
                      <p className="mt-0.5 text-foreground">
                        {selectedResident.moveInDate ? new Date(selectedResident.moveInDate).toLocaleDateString() : '-'}
                      </p>
                    </div>
                  </div>

                  {!selectedResident.isActive && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => resend.mutate(selectedResident.id)}
                      disabled={resend.isPending}
                      className="mt-5 w-full"
                    >
                      {resend.isPending ? '...' : t('admin.resendInvite')}
                    </Button>
                  )}
                </div>

                <div className="bg-card rounded-lg border border-border p-5 shadow-sm">
                  <h3 className="font-semibold text-foreground text-sm">{t('admin.manualPayment')}</h3>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">{isSpanish ? 'Mes' : 'Month'}</label>
                      <select
                        value={manualForm.billingMonth}
                        onChange={(e) => setManualForm({ ...manualForm, billingMonth: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-input bg-muted/60 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
                      >
                        {MONTHS.map((month, index) => (
                          <option key={month} value={index + 1}>{month}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">{isSpanish ? 'Año' : 'Year'}</label>
                      <input
                        type="number"
                        value={manualForm.billingYear}
                        onChange={(e) => setManualForm({ ...manualForm, billingYear: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-input bg-muted/60 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">{isSpanish ? 'Notas' : 'Notes'}</label>
                      <input
                        value={manualForm.notes}
                        onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                        className="w-full px-3 py-2 border border-input bg-muted/60 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => recordManualPayment.mutate()}
                    disabled={recordManualPayment.isPending || !manualForm.notes}
                    className="mt-4 w-full"
                  >
                    {recordManualPayment.isPending ? '...' : t('admin.manualPayment')}
                  </Button>
                </div>

                <div className="bg-card rounded-lg border border-border p-5 shadow-sm">
                  <h3 className="font-semibold text-foreground text-sm">{t('dashboard.paymentHistory')}</h3>
                  {historyLoading ? (
                    <p className="mt-4 text-sm text-muted-foreground">Cargando...</p>
                  ) : history.length === 0 ? (
                    <p className="mt-4 rounded-lg bg-muted/50 py-6 text-center text-sm text-muted-foreground">{t('dashboard.noPayments')}</p>
                  ) : (
                    <div className="mt-3 divide-y divide-border">
                      {history.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between gap-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{formatPaymentDate(p.createdAt, i18n.language)}</p>
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
              </>
            ) : (
              <div className="bg-card rounded-lg border border-border p-5 text-center text-sm text-muted-foreground shadow-sm">
                {isSpanish ? 'Selecciona un residente.' : 'Select a resident.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmailTab() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ subjectEs: '', subjectEn: '', bodyEs: '', bodyEn: '' });
  const [sent, setSent] = useState(false);

  const blast = useMutation({
    mutationFn: () => api.post('/admin/email-blast', form),
    onSuccess: () => setSent(true),
  });

  if (sent) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 text-center shadow-sm">
        <p className="text-emerald-700 dark:text-emerald-300 font-medium">✓ Correos enviados exitosamente</p>
        <button onClick={() => { setSent(false); setForm({ subjectEs: '', subjectEn: '', bodyEs: '', bodyEn: '' }); }} className="mt-3 text-sm text-primary hover:underline">
          Enviar otro
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-5 space-y-4 shadow-sm">
      <h3 className="font-semibold text-foreground text-sm">{t('admin.emailBlast')}</h3>
      <p className="text-xs text-muted-foreground">El correo se enviará a todos los residentes activos en su idioma preferido.</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: 'subjectEs', label: 'Asunto (Español)' },
          { key: 'subjectEn', label: 'Subject (English)' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
            <input
              value={(form as any)[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="w-full px-3 py-2 border border-input bg-muted/60 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
            />
          </div>
        ))}
        {[
          { key: 'bodyEs', label: 'Mensaje (Español)' },
          { key: 'bodyEn', label: 'Message (English)' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
            <textarea
              rows={4}
              value={(form as any)[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="w-full px-3 py-2 border border-input bg-muted/60 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring resize-none"
            />
          </div>
        ))}
      </div>
      <Button
        type="button"
        onClick={() => blast.mutate()}
        disabled={blast.isPending || !form.subjectEs || !form.subjectEn}
        className="w-full"
      >
        {blast.isPending ? 'Enviando...' : 'Enviar a todos los residentes'}
      </Button>
    </div>
  );
}

function AnnouncementsTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState<AnnouncementForm>(emptyAnnouncementForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AnnouncementForm>(emptyAnnouncementForm);

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.get('/announcements').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: () => api.post('/announcements', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      setForm(emptyAnnouncementForm);
    },
  });

  const update = useMutation({
    mutationFn: ({ id, values }: { id: string; values: AnnouncementForm }) => api.patch(`/announcements/${id}`, values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      setEditingId(null);
      setEditForm(emptyAnnouncementForm);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/announcements/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      setEditingId(null);
    },
  });

  const startEdit = (announcement: any) => {
    setEditingId(announcement.id);
    setEditForm({
      titleEs: announcement.titleEs || '',
      titleEn: announcement.titleEn || '',
      bodyEs: announcement.bodyEs || '',
      bodyEn: announcement.bodyEn || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyAnnouncementForm);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg border border-border p-5 space-y-3 shadow-sm">
        <h3 className="font-semibold text-foreground text-sm">Nuevo aviso</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'titleEs', label: 'Título (Español)' },
            { key: 'titleEn', label: 'Title (English)' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
              <input value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-full px-3 py-2 border border-input bg-muted/60 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring" />
            </div>
          ))}
          {[
            { key: 'bodyEs', label: 'Contenido (Español)' },
            { key: 'bodyEn', label: 'Content (English)' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
              <textarea rows={3} value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-full px-3 py-2 border border-input bg-muted/60 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring resize-none" />
            </div>
          ))}
        </div>
        <Button type="button" onClick={() => create.mutate()} disabled={create.isPending || !form.titleEs} className="w-full">
          Publicar aviso
        </Button>
      </div>

      <div className="space-y-3">
        {announcements.map((a: any) => {
          const isEditing = editingId === a.id;

          return (
            <div key={a.id} className="bg-card rounded-lg border border-border p-4 shadow-sm">
              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'titleEs', label: 'Título (Español)' },
                      { key: 'titleEn', label: 'Title (English)' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
                        <input value={(editForm as any)[key]} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} className="w-full px-3 py-2 border border-input bg-muted/60 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring" />
                      </div>
                    ))}
                    {[
                      { key: 'bodyEs', label: 'Contenido (Español)' },
                      { key: 'bodyEn', label: 'Content (English)' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
                        <textarea rows={3} value={(editForm as any)[key]} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} className="w-full px-3 py-2 border border-input bg-muted/60 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring resize-none" />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={cancelEdit}>
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => update.mutate({ id: a.id, values: editForm })}
                      disabled={update.isPending || !editForm.titleEs}
                    >
                      {update.isPending ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground text-sm">{a.titleEs}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.titleEn}</p>
                    <p className="text-xs text-muted-foreground mt-1">{a.bodyEs}</p>
                  </div>
                  <div className="flex items-center gap-3 whitespace-nowrap">
                    <button onClick={() => startEdit(a)} className="text-xs text-primary hover:underline">
                      Editar
                    </button>
                    <button onClick={() => remove.mutate(a.id)} className="text-xs text-destructive hover:underline">
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuickBooksTab() {
  const qc = useQueryClient();
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['admin-quickbooks-status'],
    queryFn: () => api.get('/admin/quickbooks/status').then((r) => r.data),
  });
  const connected = Boolean(status?.connected);

  const { data: residents = [] } = useQuery({
    queryKey: ['admin-residents'],
    queryFn: () => api.get('/admin/residents').then((r) => r.data),
  });

  const { data: customers = [], isLoading: customersLoading, isError: customersError } = useQuery({
    queryKey: ['quickbooks-customers'],
    queryFn: () => api.get<QuickBooksCustomer[]>('/admin/quickbooks/customers').then((r) => r.data),
    enabled: connected,
  });

  const connectQuickBooks = useMutation({
    mutationFn: () => api.get<{ url: string }>('/admin/quickbooks/connect-url').then((r) => r.data),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });

  const autoMap = useMutation({
    mutationFn: () => api.post('/admin/quickbooks/auto-map-customers').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-residents'] });
      qc.invalidateQueries({ queryKey: ['quickbooks-customers'] });
    },
  });

  const mapCustomer = useMutation({
    mutationFn: ({ residentId, customer }: { residentId: string; customer?: QuickBooksCustomer }) =>
      api.post(`/admin/residents/${residentId}/quickbooks-customer`, {
        customerId: customer?.id || '',
        customerName: customer?.displayName || '',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-residents'] }),
  });

  const residentRows = residents.filter((resident: any) => resident.role === 'resident');
  const mappedCount = residentRows.filter((resident: any) => resident.quickbooksCustomerId).length;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-foreground">QuickBooks accounting sync</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {connected ? 'Connected for backend payment posting. Residents never sign in to QuickBooks.' : 'Authorize the condominium QuickBooks company once to post paid resident balances.'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={connected ? 'outline' : 'default'}
              onClick={() => connectQuickBooks.mutate()}
              disabled={connectQuickBooks.isPending}
            >
              {connectQuickBooks.isPending ? 'Connecting...' : connected ? 'Refresh access' : 'Authorize accounting sync'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => autoMap.mutate()}
              disabled={!connected || autoMap.isPending}
            >
              {autoMap.isPending ? 'Mapping...' : 'Auto-map'}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <p className="text-xs text-muted-foreground">Connection</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {statusLoading ? 'Checking...' : connected ? 'Connected' : 'Not connected'}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <p className="text-xs text-muted-foreground">Customers pulled</p>
            <p className="mt-1 text-sm font-medium text-foreground">{connected ? customers.length : '-'}</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <p className="text-xs text-muted-foreground">Residents mapped</p>
            <p className="mt-1 text-sm font-medium text-foreground">{mappedCount} / {residentRows.length}</p>
          </div>
        </div>

        {connectQuickBooks.isError && (
          <p className="mt-3 text-sm text-destructive">
            Could not start QuickBooks connection. Sign in as an admin and try again.
          </p>
        )}

        {autoMap.data && (
          <p className="mt-3 text-sm text-muted-foreground">
            Auto-map finished: {autoMap.data.mapped?.length ?? 0} mapped, {autoMap.data.unmatched?.length ?? 0} unmatched.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h3 className="font-semibold text-foreground text-sm">Resident customer mapping</h3>
        {!connected ? (
          <p className="mt-4 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            Authorize QuickBooks accounting sync to pull customers and map them to residents.
          </p>
        ) : customersError ? (
          <p className="mt-4 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
            Could not pull QuickBooks customers. Refresh accounting access and try again.
          </p>
        ) : customersLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading QuickBooks customers...</p>
        ) : (
          <div className="mt-4 divide-y divide-border">
            {residentRows.map((resident: any) => (
              <div key={resident.id} className="grid gap-3 py-3 md:grid-cols-[1fr_1.2fr] md:items-center">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {resident.firstName} {resident.lastName} · Apto {resident.apartmentNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">{resident.email}</p>
                </div>
                <select
                  value={resident.quickbooksCustomerId || ''}
                  onChange={(event) => {
                    const customer = customers.find((item) => item.id === event.target.value);
                    mapCustomer.mutate({ residentId: resident.id, customer });
                  }}
                  disabled={mapCustomer.isPending}
                  className="w-full rounded-md border border-input bg-muted/60 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                >
                  <option value="">No QuickBooks customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.displayName}{customer.email ? ` - ${customer.email}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { t, i18n } = useTranslation();
  const { logout } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Resumen' },
    { key: 'residents', label: t('admin.residents') },
    { key: 'email', label: 'Correos' },
    { key: 'announcements', label: 'Avisos' },
    { key: 'quickbooks', label: 'QuickBooks' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-card border-b border-border px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-foreground text-lg">Condominio Los Cedros</h1>
            <p className="text-xs text-muted-foreground">{t('admin.title')}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-md border bg-background/70 p-1">
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
            <Button type="button" variant="ghost" size="sm" onClick={logout}>
              {t('nav.logout')}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 pt-6">
        <div className="flex gap-1 bg-muted rounded-lg p-1 mb-6">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${tab === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'overview' && <OverviewTab />}
        {tab === 'residents' && <ResidentsTab />}
        {tab === 'email' && <EmailTab />}
        {tab === 'announcements' && <AnnouncementsTab />}
        {tab === 'quickbooks' && <QuickBooksTab />}
      </div>
    </div>
  );
}
