// Identity of the people responsible for the site, shown on the legal notice
// and privacy policy pages. Required by French law (LCEN art. 6 III) and the
// GDPR (art. 13). Every "[...]" value MUST be filled in before the site is
// opened to real users.
export const LEGAL_INFO = {
  publisher: {
    name: "[Publisher: company name or full name]",
    legalForm: "[Legal form and share capital, or “Individual”]",
    registration: "[RCS / SIREN number, if any]",
    address: "[Postal address]",
    email: "[contact@example.com]",
  },
  publicationDirector: "[Full name of the publication director]",
  host: {
    name: "[Hosting provider name]",
    address: "[Hosting provider postal address]",
    phone: "[Hosting provider phone number]",
    location: "[Country where the servers are located, e.g. France / EU]",
  },
  // Address that receives GDPR requests (access, erasure, objection...).
  privacyContact: "[privacy@example.com]",
  // How long database backups keep deleted data, if backups exist.
  backupRetention: "[e.g. 30 days]",
  lastUpdated: "2026-10-01",
} as const;
