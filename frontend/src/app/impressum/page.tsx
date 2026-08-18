import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Impressum',
};

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-10 transition-colors">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold hover:text-slate-800 dark:hover:text-slate-200 transition mb-8 group w-fit"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Zurück
        </Link>

        <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-6">Impressum</h1>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 space-y-6 text-slate-700 dark:text-slate-300">
          <section>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              Angaben gemäß § 5 TMG
            </h2>
            <p>
              Maximilian Starp
              <br />
              Robert-Havemann-Straße 3
              <br />
              53121 Bonn
              <br />
              Deutschland
            </p>
          </section>

          <section>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              Kontakt
            </h2>
            <p>
              E-Mail: maximilian@starp.email
            </p>
          </section>

          <section>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              Haftung für Inhalte
            </h2>
            <p>
              Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen
              Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir
              als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte
              fremde Informationen zu überwachen.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
