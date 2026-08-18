import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export const metadata = {
  title: 'Datenschutzerklärung',
};

export default function DatenschutzPage() {
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

        <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-6">
          Datenschutzerklärung
        </h1>

        {/* Not legal advice - the sections describing what data PlannerPro
            actually processes are accurate to the current codebase, but this
            hasn't been legally reviewed. Hosting/mail-provider fields below
            stay open until an actual server/SMTP provider is chosen. */}
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-400 px-5 py-4 rounded-2xl mb-8 text-sm font-semibold">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <span>
            Hosting- und E-Mail-Versand-Angaben (Abschnitt 4) folgen, sobald ein produktiver
            Server bzw. E-Mail-Versand eingerichtet ist. Bis dahin läuft die App in der
            Entwicklung/Beta ohne externen Hosting- oder Mail-Anbieter.
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              1. Verantwortlicher
            </h2>
            <p>
              Maximilian Starp
              <br />
              Robert-Havemann-Straße 3, 53121 Bonn
              <br />
              E-Mail: maximilian@starp.email
            </p>
          </section>

          <section>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              2. Welche Daten wir verarbeiten
            </h2>
            <p className="mb-2">
              <strong>Account:</strong> Username, E-Mail-Adresse, Passwort (nur als
              Salted-Hash gespeichert, nie im Klartext).
            </p>
            <p className="mb-2">
              <strong>E-Mail-Verifizierung / Passwort-Reset:</strong> Ein zeitlich begrenzter,
              6-stelliger Code wird an die angegebene E-Mail-Adresse gesendet und nur als Hash
              gespeichert.
            </p>
            <p className="mb-2">
              <strong>Projektdaten:</strong> Die von dir eingegebenen Module, Zeiten und
              Tutoriumsgruppen sowie die daraus berechneten Stundenpläne - ausschließlich zur
              Nutzung der Planungsfunktion.
            </p>
            <p>
              <strong>Server-Logs:</strong> Beim Aufruf der Website werden technisch bedingt
              Zugriffsdaten (u. a. IP-Adresse, Zeitpunkt, aufgerufene Seite) durch [Hosting-
              Provider eintragen] verarbeitet, wie es bei praktisch jedem Webserver-Betrieb der
              Fall ist.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              3. Zweck und Rechtsgrundlage
            </h2>
            <p>
              Die Verarbeitung erfolgt zur Bereitstellung des Dienstes (Account-Verwaltung,
              Speicherung deiner Stundenpläne) gemäß Art. 6 Abs. 1 lit. b DSGVO
              (Vertragserfüllung) sowie zur Gewährleistung der Sicherheit des Angebots
              (z. B. Server-Logs, Rate-Limiting gegen Missbrauch) gemäß Art. 6 Abs. 1 lit. f
              DSGVO (berechtigtes Interesse).
            </p>
          </section>

          <section>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              4. Empfänger / Dritte
            </h2>
            <p className="mb-2">
              Hosting: [wird ergänzt, sobald ein Hosting-Anbieter für den produktiven Betrieb
              feststeht].
            </p>
            <p>
              E-Mail-Versand (Verifizierungscodes, Passwort-Reset): Aktuell wird kein externer
              E-Mail-Anbieter genutzt - Codes werden ausschließlich im Server-Log ausgegeben
              statt versendet. Sobald ein SMTP-/E-Mail-Anbieter für den produktiven Betrieb
              eingerichtet ist, wird er hier ergänzt. Eine Weitergabe an sonstige Dritte findet
              nicht statt.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              5. Speicherdauer
            </h2>
            <p>
              Deine Daten werden gespeichert, solange dein Account besteht. Du kannst deinen
              Account inklusive aller Projekte und Stundenpläne jederzeit selbst über
              Einstellungen → Account löschen dauerhaft entfernen; die Löschung erfolgt sofort.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              6. Cookies
            </h2>
            <p>
              Es wird ausschließlich ein technisch notwendiges Session-Cookie gesetzt, um dich
              eingeloggt zu halten (kein Tracking, keine Analyse-/Werbe-Cookies). Da es sich um
              ein technisch erforderliches Cookie handelt, ist hierfür gemäß § 25 Abs. 2 TTDSG
              keine Einwilligung erforderlich.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              7. Deine Rechte
            </h2>
            <p>
              Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO),
              Löschung (Art. 17 DSGVO), Einschränkung der Verarbeitung (Art. 18 DSGVO),
              Datenübertragbarkeit (Art. 20 DSGVO) sowie Widerspruch (Art. 21 DSGVO) gegen die
              Verarbeitung deiner Daten. Zudem steht dir ein Beschwerderecht bei einer
              Datenschutzaufsichtsbehörde zu.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              8. Datensicherheit
            </h2>
            <p>
              Passwörter werden nie im Klartext gespeichert (SHA-256-vorgehashed, dann bcrypt).
              [Sobald TLS/HTTPS für den produktiven Betrieb aktiv ist, hier ergänzen:
              &bdquo;Die Übertragung erfolgt verschlüsselt über TLS.&ldquo;]
            </p>
          </section>

          <section>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              9. Änderungen
            </h2>
            <p>
              Diese Datenschutzerklärung wird bei Änderungen an der Datenverarbeitung
              entsprechend angepasst - insbesondere sobald Hosting- und E-Mail-Anbieter für den
              produktiven Betrieb feststehen (siehe Hinweis oben). Stand: 18.08.2026.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
