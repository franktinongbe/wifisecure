import { describe, expect, it } from 'vitest';
import { evaluateAlerts } from '../src/lib/alertRules';

describe('evaluateAlerts', () => {
  it('returns volume alert when session exceeds threshold', () => {
    const alerts = evaluateAlerts({
      volumeOctets: 3_000_000_000,
      domain: 'example.com',
      thresholdBytes: 2_000_000_000,
      blockedDomains: ['facebook.com'],
    });

    expect(alerts.some((alert) => alert.alertType === 'volume_eleve')).toBe(true);
  });

  it('returns blocked domain alert when domain is blacklisted', () => {
    const alerts = evaluateAlerts({
      volumeOctets: 100_000,
      domain: 'facebook.com',
      thresholdBytes: 2_000_000_000,
      blockedDomains: ['facebook.com'],
    });

    expect(alerts.some((alert) => alert.alertType === 'domaine_bloque')).toBe(true);
  });

  it('returns no alerts for a normal session', () => {
    const alerts = evaluateAlerts({
      volumeOctets: 300_000,
      domain: 'bibliotheque.bj',
      thresholdBytes: 2_000_000_000,
      blockedDomains: ['facebook.com'],
    });

    expect(alerts).toHaveLength(0);
  });
});
