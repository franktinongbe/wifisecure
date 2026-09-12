import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WiFiSecure – Bibliothèque',
  description: 'Tableau de bord de suivi et de sécurisation du réseau Wi-Fi public',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
