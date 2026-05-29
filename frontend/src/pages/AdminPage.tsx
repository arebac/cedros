import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

type Tab = 'overview' | 'residents' | 'email' | 'announcements';

function StatusBadge({ paid, isActive }: { paid: boolean; isActive: boolean }) {
  if (!isActive) return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Sin activar</span>;
  return paid
    ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Al día</span>
    : <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Pendiente</span>;
}

function OverviewTab() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => api.get('/admin/overview').then((r) => r.data),
  });

  if (isLoading) return <div className="py-12 text-center text-gray-400">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t('admin.totalUnits'), value: data.total, color: 'text-gray-800' },
          { label: t('admin.paid'), value: data.paid, color: 'text-green-600' },
          { label: t('admin.unpaid'), value: data.unpaid, color: 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-700 text-sm">{t('admin.residents')}</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {data.residents.map((r: any) => (
            <div key={r.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#C0522A]/10 text-[#C0522A] flex items-center justify-center text-xs font-bold">
                  {r.apartmentNumber}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{r.fullName}</p>
                  <p className="text-xs text-gray-400">{r.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-600">${Number(r.monthlyFee).toFixed(2)}</p>
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
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', apartmentNumber: '', phone: '', moveInDate: '', language: 'es' });

  const { data: residents = [], isLoading } = useQuery({
    queryKey: ['admin-residents'],
    queryFn: () => api.get('/admin/residents').then((r) => r.data),
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[#C0522A] text-white text-sm font-medium rounded-lg hover:bg-[#a8461e] transition-colors"
        >
          {t('admin.addResident')}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-700 mb-4 text-sm">{t('admin.addResident')}</h3>
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
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input
                  type={type}
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C0522A]/30 focus:border-[#C0522A]"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('admin.fields.language')}</label>
              <select
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={() => create.mutate(form)}
              disabled={create.isPending}
              className="flex-1 py-2 bg-[#C0522A] text-white text-sm font-medium rounded-lg hover:bg-[#a8461e] disabled:opacity-60"
            >
              {create.isPending ? '...' : 'Guardar y enviar invitación'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-gray-400">Cargando...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {residents.map((r: any) => (
              <div key={r.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">{r.firstName} {r.lastName} <span className="text-gray-400 font-normal">· Apto {r.apartmentNumber}</span></p>
                  <p className="text-xs text-gray-400">{r.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!r.isActive && (
                    <button
                      onClick={() => resend.mutate(r.id)}
                      className="text-xs text-[#C0522A] hover:underline"
                    >
                      {t('admin.resendInvite')}
                    </button>
                  )}
                  <StatusBadge paid={false} isActive={r.isActive} />
                </div>
              </div>
            ))}
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
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <p className="text-green-700 font-medium">✓ Correos enviados exitosamente</p>
        <button onClick={() => { setSent(false); setForm({ subjectEs: '', subjectEn: '', bodyEs: '', bodyEn: '' }); }} className="mt-3 text-sm text-green-600 hover:underline">
          Enviar otro
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
      <h3 className="font-semibold text-gray-700 text-sm">{t('admin.emailBlast')}</h3>
      <p className="text-xs text-gray-400">El correo se enviará a todos los residentes activos en su idioma preferido.</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: 'subjectEs', label: 'Asunto (Español)' },
          { key: 'subjectEn', label: 'Subject (English)' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
            <input
              value={(form as any)[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C0522A]/30 focus:border-[#C0522A]"
            />
          </div>
        ))}
        {[
          { key: 'bodyEs', label: 'Mensaje (Español)' },
          { key: 'bodyEn', label: 'Message (English)' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
            <textarea
              rows={4}
              value={(form as any)[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C0522A]/30 focus:border-[#C0522A] resize-none"
            />
          </div>
        ))}
      </div>
      <button
        onClick={() => blast.mutate()}
        disabled={blast.isPending || !form.subjectEs || !form.subjectEn}
        className="w-full py-2.5 bg-[#C0522A] hover:bg-[#a8461e] disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors"
      >
        {blast.isPending ? 'Enviando...' : 'Enviar a todos los residentes'}
      </button>
    </div>
  );
}

function AnnouncementsTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ titleEs: '', titleEn: '', bodyEs: '', bodyEn: '' });

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.get('/announcements').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: () => api.post('/announcements', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      setForm({ titleEs: '', titleEn: '', bodyEs: '', bodyEn: '' });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/announcements/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
        <h3 className="font-semibold text-gray-700 text-sm">Nuevo aviso</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'titleEs', label: 'Título (Español)' },
            { key: 'titleEn', label: 'Title (English)' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C0522A]/30 focus:border-[#C0522A]" />
            </div>
          ))}
          {[
            { key: 'bodyEs', label: 'Contenido (Español)' },
            { key: 'bodyEn', label: 'Content (English)' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <textarea rows={3} value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none" />
            </div>
          ))}
        </div>
        <button onClick={() => create.mutate()} disabled={create.isPending || !form.titleEs} className="w-full py-2 bg-[#C0522A] text-white text-sm font-medium rounded-lg hover:bg-[#a8461e] disabled:opacity-60">
          Publicar aviso
        </button>
      </div>

      <div className="space-y-3">
        {announcements.map((a: any) => (
          <div key={a.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start justify-between">
            <div>
              <p className="font-medium text-gray-700 text-sm">{a.titleEs}</p>
              <p className="text-xs text-gray-500 mt-0.5">{a.titleEn}</p>
              <p className="text-xs text-gray-400 mt-1">{a.bodyEs}</p>
            </div>
            <button onClick={() => remove.mutate(a.id)} className="text-xs text-red-500 hover:underline ml-4 whitespace-nowrap">
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Resumen' },
    { key: 'residents', label: t('admin.residents') },
    { key: 'email', label: 'Correos' },
    { key: 'announcements', label: 'Avisos' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-800 text-lg">Condominio Los Cedros</h1>
            <p className="text-xs text-gray-400">{t('admin.title')}</p>
          </div>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            {t('nav.logout')}
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 pt-6">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'overview' && <OverviewTab />}
        {tab === 'residents' && <ResidentsTab />}
        {tab === 'email' && <EmailTab />}
        {tab === 'announcements' && <AnnouncementsTab />}
      </div>
    </div>
  );
}
