export type AlertEvaluation = {
  alertType: 'volume_eleve' | 'domaine_bloque';
  message: string;
};

export function evaluateAlerts({
  volumeOctets,
  domain,
  thresholdBytes,
  blockedDomains,
}: {
  volumeOctets: number;
  domain?: string | null;
  thresholdBytes: number;
  blockedDomains: string[];
}): AlertEvaluation[] {
  const alerts: AlertEvaluation[] = [];

  if (volumeOctets > thresholdBytes) {
    alerts.push({
      alertType: 'volume_eleve',
      message: `Volume élevé : ${formatBytes(volumeOctets)} > ${formatBytes(thresholdBytes)}`,
    });
  }

  const normalizedDomain = (domain ?? '').trim().toLowerCase();
  if (normalizedDomain && blockedDomains.some((item) => item.trim().toLowerCase() === normalizedDomain)) {
    alerts.push({
      alertType: 'domaine_bloque',
      message: `Domaine bloqué : ${normalizedDomain}`,
    });
  }

  return alerts;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
