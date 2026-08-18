import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

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

        {/* Not legal advice - this whole page is a fill-in-the-blanks starting
            point (Angaben gemäß § 5 TMG), not a substitute for checking the
            current requirements yourself before a public launch. */}
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-400 px-5 py-4 rounded-2xl mb-8 text-sm font-semibold">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <span>
            Platzhalter-Seite - noch nicht ausgefüllt. Vor dem Beta-Launch mit den echten Angaben
            ersetzen (und im Zweifel rechtlich prüfen lassen).
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 space-y-6 text-slate-700 dark:text-slate-300">
          <section>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              Angaben gemäß § 5 TMG
            </h2>
            <p>
              [Name / Firma]
              <br />
              [Straße Hausnummer]
              <br />
              [PLZ Ort]
              <br />
              [Land]
            </p>
          </section>

          <section>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              Kontakt
            </h2>
            <p>
              E-Mail: [kontakt@example.com]
              <br />
              Telefon: [optional]
            </p>
          </section>

          <section>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              Vertreten durch
            </h2>
            <p>
              [Nur nötig, wenn Betreiber keine natürliche Person ist, z. B. bei einer GbR/UG -
              sonst entfernen]
            </p>
          </section>

          <section>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              Umsatzsteuer-ID
            </h2>
            <p>
              [Nur falls vorhanden, z. B. nach § 27a UStG - sonst Abschnitt entfernen]
            </p>
          </section>

          <section>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              Streitschlichtung
            </h2>
            <p>
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen. [Anpassen, falls das nicht zutrifft.]
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
