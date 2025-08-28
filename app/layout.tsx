import type { Metadata } from 'next';
import React from 'react';
import ThemeRegistry from '@/components/providers/ThemeRegistry';
import './globals.css';
import 'filepond/dist/filepond.min.css';
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';

import { GlobalErrorBoundary } from '@/components/shared/GlobalErrorBoundary';
import LayoutWrapper from '@/components/layout/LayoutWrapper';
import { loadAppSettings } from '@/lib/services/app-settings';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadAppSettings();
  const footerBrand = settings.NOM_ETABLISSEMENT || settings.brandingName || 'Paul VALÉRY • Paris 12e';
  const brandSuffix = footerBrand ? ` - ${footerBrand}` : '';

  return {
    title: {
      default: `SGIL${brandSuffix}`,
      template: `%s — SGIL${brandSuffix}`
    },
    description: "Système complet de gestion de laboratoire scolaire : planification des séances, gestion du matériel, inventaire des réactifs chimiques, cahiers de TP et suivi des équipements.",
    keywords: [
      "laboratoire", "école", "physique", "chimie", "TP", "matériel", "réactifs",
      "gestion", "inventaire", "planification", "équipement", "sécurité", "éducation"
    ],
    authors: [{ name: "M. Idriss SEKRANE" }],
    creator: "M. Idriss SEKRANE",
    publisher: `SGIL${brandSuffix}`,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title: `SGIL${brandSuffix}`,
      description: "Plateforme complète pour la gestion des laboratoires scolaires : planification, matériel, réactifs, sécurité et suivi pédagogique.",
      url: "https://labo.sekrane.fr",
      siteName: `SGIL${brandSuffix}`,
      images: [
        {
          url: "https://labo.sekrane.fr/static_images/og-image.png",
          width: 1200,
          height: 630,
          alt: `SGIL${brandSuffix}`,
        },
      ],
      locale: "fr_FR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `SGIL${brandSuffix}`,
      description: "Plateforme complète pour la gestion des laboratoires scolaires : planification, matériel, réactifs, sécurité et suivi pédagogique.",
      images: [
        {
          url: "https://labo.sekrane.fr/static_images/og-image.png",
          alt: `SGIL${brandSuffix}`,
        },
      ],
    },
    other: {
      "og:image:width": "1200",
      "og:image:height": "630",
      "og:image:type": "image/jpeg",
      "theme-color": "#1976d2",
      "msapplication-TileColor": "#1976d2",
      "msapplication-TileImage": "/static_images/apple-touch-icon.png",
      "format-detection": "telephone=no",
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await loadAppSettings();
  const footerBrand = settings.NOM_ETABLISSEMENT || settings.brandingName || '';
  const brandSuffix = footerBrand ? ` - ${footerBrand}` : '';

  return (
    <html lang="fr">
      <head>
        {/* Favicon et icônes pour tous les appareils */}
        <link rel="icon" href="/static_images/favicon.ico" sizes="any" />
        <link rel="icon" href="/static_images/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/static_images/apple-touch-icon.png" />
        <link rel="apple-touch-icon-precomposed" href="/static_images/apple-touch-icon-precomposed.png" />

        {/* Balises meta additionnelles pour le partage universel */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SGIL" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="SGIL" />

        {/* Pour WhatsApp et autres messageries */}
        <meta property="og:description" content="Système complet de gestion de laboratoire scolaire : planification des séances, gestion du matériel, inventaire des réactifs chimiques, cahiers de TP et suivi des équipements." />
        <meta property="og:title" content="SGIL" />
        <meta property="og:image" content="https://labo.sekrane.fr/static_images/og-image.png" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://labo.sekrane.fr" />
        <meta property="og:site_name" content="SGIL - Laboratoire Sekrane" />
        <meta property="og:locale" content="fr_FR" />

        {/* Canonical URL */}
        <link rel="canonical" href="https://labo.sekrane.fr" />

        {/* Sitemap */}
        <link rel="sitemap" type="application/xml" href="/sitemap.xml" />

        {/* Manifest pour PWA */}
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <GlobalErrorBoundary>
          <LayoutWrapper>{children}</LayoutWrapper>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
