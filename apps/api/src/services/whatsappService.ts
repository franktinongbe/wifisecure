import { env } from '../config/env.js';

type Incident = {
  createdAt: Date;
  message: string;
  session: {
    identifiantUsager: string;
    appareil: string;
    adresseIp: string | null;
    adresseMac: string | null;
    navigateur: string | null;
  };
};

export function isWhatsAppConfigured() {
  return Boolean(
    env.whatsappAccessToken && env.whatsappPhoneNumberId && env.whatsappAdminPhone &&
    env.whatsappGraphApiVersion && env.whatsappAlertTemplate,
  );
}

export async function sendWhatsAppIncidentAlert(incident: Incident) {
  if (!isWhatsAppConfigured()) return false;

  const endpoint = `https://graph.facebook.com/${env.whatsappGraphApiVersion}/${env.whatsappPhoneNumberId}/messages`;
  const parameters = [
    incident.session.identifiantUsager,
    incident.message,
    incident.session.appareil,
    incident.session.adresseIp ?? 'Non renseignee',
    incident.session.adresseMac ?? 'Non renseignee',
    incident.session.navigateur ?? 'Non renseigne',
    incident.createdAt.toLocaleString('fr-FR', { timeZone: 'Africa/Porto-Novo' }),
  ].map((text) => ({ type: 'text', text: text.slice(0, 900) }));

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.whatsappAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: env.whatsappAdminPhone,
      type: 'template',
      template: {
        name: env.whatsappAlertTemplate,
        language: { code: env.whatsappTemplateLanguage },
        components: [{ type: 'body', parameters }],
      },
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    console.error(`WhatsApp incident notification failed with HTTP ${response.status}.`);
    return false;
  }
  return true;
}
