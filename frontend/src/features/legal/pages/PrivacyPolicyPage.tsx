import { Link } from "react-router-dom";

import { LEGAL_INFO } from "../legal.config";

import styles from "./LegalPage.module.css";

export function PrivacyPolicyPage() {
  const { publisher, host, privacyContact } = LEGAL_INFO;

  const contactLink = <a href={`mailto:${privacyContact}`}>{privacyContact}</a>;

  return (
    <main className={styles.page}>
      <article className={styles.content}>
        <nav className={styles.nav} aria-label="Legal">
          <Link to="/projects">← Back to the app</Link>
          <Link to="/legal-notice">Legal notice</Link>
        </nav>

        <h1>Privacy policy</h1>

        <p className={styles.updated}>Last updated: {LEGAL_INFO.lastUpdated}</p>

        <p>
          This page explains which personal data Kanban App collects, why, how
          long it is kept and how you can exercise your rights under the General
          Data Protection Regulation (GDPR / RGPD) and the French “Informatique
          et Libertés” law.
        </p>

        <h2>Data controller</h2>

        <p>
          {publisher.name}, {publisher.address}. For any question about your
          data, write to {contactLink}.
        </p>

        <h2>Data we collect</h2>

        <ul>
          <li>
            <strong>Account:</strong> your name, email address and password. The
            password is never stored in clear text, only as a one-way bcrypt
            hash.
          </li>
          <li>
            <strong>Content you create:</strong> projects, boards and tasks
            (titles, descriptions, statuses, priorities, deadlines).
          </li>
          <li>
            <strong>Collaboration:</strong> the projects you are a member of and
            your role, invitations you send or receive, tasks assigned to you,
            and the notifications generated for you.
          </li>
          <li>
            <strong>Technical data:</strong> server logs and traces (date,
            requested address, response status, and possibly your IP address)
            used to keep the service secure and working.
          </li>
        </ul>

        <p>
          We do not use advertising, analytics or any third-party tracker, and
          we never sell your data.
        </p>

        <h2>Why we use it and on which legal basis</h2>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Purpose</th>
                <th scope="col">Legal basis (GDPR art. 6)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  Creating and running your account, letting you manage and
                  share projects, sending you in-app notifications
                </td>
                <td>
                  Performance of the contract (providing the service you signed
                  up for) — 6.1.b
                </td>
              </tr>
              <tr>
                <td>
                  Security, abuse prevention (e.g. limiting login attempts) and
                  troubleshooting
                </td>
                <td>Our legitimate interest in a secure service — 6.1.f</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>Who can see your data</h2>

        <ul>
          <li>
            Members of a project you belong to see your name and email address,
            and the content of that project.
          </li>
          <li>
            Platform administrators can see projects, their members and task
            assignments to operate the service.
          </li>
          <li>
            Our hosting provider, {host.name}, stores the data on our behalf (
            {host.location}).
          </li>
        </ul>

        <h2>How long we keep it</h2>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Retention</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Account, projects, tasks, notifications</td>
                <td>
                  Until you delete your account. Deletion is immediate; backup
                  copies are overwritten within {LEGAL_INFO.backupRetention}.
                </td>
              </tr>
              <tr>
                <td>Pending invitations</td>
                <td>Until accepted, declined, or your account is deleted</td>
              </tr>
              <tr>
                <td>Server logs</td>
                <td>7 days</td>
              </tr>
              <tr>
                <td>Request traces</td>
                <td>3 days</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          When you delete your account, the projects you own are deleted with
          it. Tasks assigned to you in other people&apos;s projects stay in
          those projects but are no longer linked to you.
        </p>

        <h2>Cookies</h2>

        <p>
          We only use two cookies, both strictly necessary to keep you signed
          in, so they do not require your consent:
        </p>

        <ul>
          <li>
            <strong>accessToken</strong> — proves you are signed in, expires
            after 15 minutes.
          </li>
          <li>
            <strong>refreshToken</strong> — renews your session, expires after 7
            days or when you log out.
          </li>
        </ul>

        <p>
          Both are inaccessible to scripts (HttpOnly) and never sent to other
          sites (SameSite=Strict).
        </p>

        <h2>Your rights</h2>

        <ul>
          <li>
            <strong>Access and portability</strong> — Profile → Your data →{" "}
            <em>Download my personal data</em> gives you everything we hold
            about you as a JSON file.
          </li>
          <li>
            <strong>Rectification</strong> — edit your name and email from your
            Profile.
          </li>
          <li>
            <strong>Erasure</strong> — Profile → Danger zone →{" "}
            <em>Delete account</em> permanently deletes your account and the
            data you own.
          </li>
          <li>
            <strong>Restriction and objection</strong> — write to {contactLink}.
            We answer within one month.
          </li>
        </ul>

        <p>
          If you think your rights are not respected, you can lodge a complaint
          with the CNIL (
          <a href="https://www.cnil.fr/fr/plaintes" rel="noreferrer">
            www.cnil.fr
          </a>
          ).
        </p>

        <h2>Security</h2>

        <p>
          Passwords are hashed with bcrypt, sessions use short-lived HttpOnly
          cookies, repeated failed login attempts are blocked, and sensitive
          values are removed from our logs.
        </p>

        <h2>Changes</h2>

        <p>
          We will update this page if our processing changes; the date at the
          top shows the latest version.
        </p>
      </article>
    </main>
  );
}
