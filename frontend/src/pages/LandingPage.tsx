import { ChevronRight, Globe2, Megaphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

const MONTHS = {
  es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

const COPY = {
  es: {
    eyebrow: 'Portal residencial',
    intro: 'Pagos y avisos oficiales del Condominio Los Cedros.',
    signIn: 'Entrar al portal',
    latest: 'Avisos recientes',
    emptyTitle: 'Sin avisos nuevos',
    emptyBody: 'Cuando administración publique un comunicado, aparecerá aquí.',
    footer: 'Administración Condominio Los Cedros',
  },
  en: {
    eyebrow: 'Resident portal',
    intro: 'Payments and official notices for Condominio Los Cedros.',
    signIn: 'Enter portal',
    latest: 'Recent announcements',
    emptyTitle: 'No new announcements',
    emptyBody: 'When administration posts an update, it will appear here.',
    footer: 'Condominio Los Cedros Administration',
  },
};

type Announcement = {
  id: string;
  createdAt: string;
  titleEs: string;
  titleEn: string;
  bodyEs: string;
  bodyEn: string;
};

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'es';
  const copy = COPY[lang];

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.get<Announcement[]>('/announcements').then((r) => r.data),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link to="/" className="text-sm font-semibold uppercase">
            Los Cedros
          </Link>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 rounded-md border bg-background/70 p-1 shadow-sm backdrop-blur sm:flex">
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
        </div>
      </header>

      <main>
        <section className="relative min-h-[72svh] overflow-hidden border-b">
          <img
            src="/building.jpeg"
            alt="Condominio Los Cedros"
            className="absolute inset-0 h-full w-full object-cover object-[center_62%] opacity-[0.12] grayscale dark:opacity-[0.18]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />

          <div className="relative z-10 mx-auto flex min-h-[72svh] w-full max-w-6xl items-end px-5 pb-16 pt-28 sm:px-8 lg:pb-20">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-muted-foreground">{copy.eyebrow}</p>
              <h1 className="mt-5 max-w-xl text-5xl font-semibold leading-none sm:text-6xl">
                {t('landing.title')}
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
                {copy.intro}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link to="/login">
                    {copy.signIn}
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <div className="flex items-center gap-1 rounded-md border bg-background/80 p-1 shadow-sm backdrop-blur sm:hidden">
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
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8">
          <div className="mb-6 flex items-center justify-between gap-4 border-b pb-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('landing.announcements')}</p>
              <h2 className="mt-1 text-2xl font-semibold">{copy.latest}</h2>
            </div>
            <div className="grid size-9 place-items-center rounded-md border text-muted-foreground">
              <Megaphone className="size-4" aria-hidden="true" />
            </div>
          </div>

          {announcements.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6">
              <h3 className="font-medium">{copy.emptyTitle}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.emptyBody}</p>
            </div>
          ) : (
            <div className="divide-y">
              {announcements.map((a) => {
                const date = new Date(a.createdAt);
                const dateStr = `${date.getDate()} ${MONTHS[lang][date.getMonth()]} ${date.getFullYear()}`;

                return (
                  <article key={a.id} className="py-5 first:pt-0 last:pb-0">
                    <p className="text-xs font-medium uppercase text-muted-foreground">{dateStr}</p>
                    <h3 className="mt-2 font-medium">
                      {lang === 'es' ? a.titleEs : a.titleEn}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {lang === 'es' ? a.bodyEs : a.bodyEn}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t px-5 py-6 text-center text-sm text-muted-foreground sm:px-8">
        © {new Date().getFullYear()} {copy.footer}
      </footer>
    </div>
  );
}
