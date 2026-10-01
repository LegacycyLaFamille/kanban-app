import { Link } from "react-router-dom";

import { LEGAL_INFO } from "../legal.config";

import styles from "./LegalPage.module.css";

export function LegalNoticePage() {
  const { publisher, host } = LEGAL_INFO;

  return (
    <main className={styles.page}>
      <article className={styles.content}>
        <nav className={styles.nav} aria-label="Legal">
          <Link to="/projects">← Back to the app</Link>
          <Link to="/privacy">Privacy policy</Link>
        </nav>

        <h1>Legal notice</h1>

        <p className={styles.updated}>Last updated: {LEGAL_INFO.lastUpdated}</p>

        <h2>Publisher</h2>

        <p>
          {publisher.name}
          <br />
          {publisher.legalForm}
          <br />
          {publisher.registration}
          <br />
          {publisher.address}
          <br />
          Contact: <a href={`mailto:${publisher.email}`}>{publisher.email}</a>
        </p>

        <h2>Publication director</h2>

        <p>{LEGAL_INFO.publicationDirector}</p>

        <h2>Hosting</h2>

        <p>
          {host.name}
          <br />
          {host.address}
          <br />
          {host.phone}
        </p>

        <h2>Personal data</h2>

        <p>
          How we process your personal data and how to exercise your rights is
          described in our <Link to="/privacy">Privacy policy</Link>.
        </p>
      </article>
    </main>
  );
}
