// Shared bits for the aptonym certificate flow: /aptonyms/certificate (claim), /aptonyms/certificate/<code>
// (the certificate), /aptonyms/certificate/review (Matthew's review page). Data lives in Supabase
// `aptonym_certificates`, reached only through the RPCs in aptonym-certificates-supabase-setup.sql.

export const SITE = 'https://theothermatthewmiller.com';
export const ISSUER = 'The Aptonym Registry';
export const CREDENTIAL = 'Certified Aptonym';
export const REGISTRAR = 'Matthew Miller';
export const MOTTO = 'Nomen est omen';

// LinkedIn Page that issues the credential (linkedin.com/company/theothermatthewmiller). With an id,
// LinkedIn shows that Page's name and logo as the issuer; without one it would fall back to ISSUER as text.
export const LINKEDIN_ORG_ID = '118444522';
export const LINKEDIN_ISSUER = 'The Other Matthew Miller';

export type Part = 'First' | 'Last' | 'Both';

export interface Certificate {
  code: string;
  name: string;
  aptonym_part: Part;
  profession: string;
  how_it_fits: string;
  proof_url: string | null;
  linkedin_url: string | null;
  status: 'pending' | 'issued' | 'declined';
  issued_at: string | null;
  created_at: string;
  aptonym_name: string | null;
  note_from_registrar: string | null;
}

export const certUrl = (code: string) => `${SITE}/aptonyms/certificate/${code}`;

/** LinkedIn's "Add to profile" link: opens Licenses & certifications prefilled with this credential. */
export function linkedInAddUrl(c: Pick<Certificate, 'code' | 'issued_at'>): string {
  const d = new Date(c.issued_at ?? Date.now());
  const p = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: CREDENTIAL,
    issueYear: String(d.getUTCFullYear()),
    issueMonth: String(d.getUTCMonth() + 1),
    certUrl: certUrl(c.code),
    certId: c.code,
  });
  if (LINKEDIN_ORG_ID) p.set('organizationId', LINKEDIN_ORG_ID);
  else p.set('organizationName', ISSUER);
  return `https://www.linkedin.com/profile/add?${p.toString()}`;
}

/** LinkedIn's share box with the certificate page attached (it reads the page's og: tags). */
export const linkedInShareUrl = (code: string) =>
  `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(certUrl(code))}`;

/** Split a name into [before, aptonym, after] so the fitting part can be gilded. */
export function splitName(name: string, part: Part): [string, string, string] {
  const words = name.trim().split(/\s+/);
  if (part === 'Both' || words.length < 2) return ['', name.trim(), ''];
  if (part === 'First') return ['', words[0], ' ' + words.slice(1).join(' ')];
  return [words.slice(0, -1).join(' ') + ' ', words[words.length - 1], ''];
}

export const partPhrase = (part: Part) =>
  part === 'Both' ? 'whose name' : part === 'First' ? 'whose first name' : 'whose surname';

export const formatDate = (iso: string | null) =>
  new Date(iso ?? Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
