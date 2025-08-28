// lib/docs/content.ts

export type DocsModule = {
  id: string;
  title: string;
  keywords: string[];
  summary: string;
  sections: { heading: string; points: string[] }[];
};

export const modules: DocsModule[] = [
  {
    id: 'guides',
    title: "Guides d'utilisation",
    keywords: ['guide', 'utilisation', 'preset', 'tp', 'cahier', 'materiel', 'équipement'],
    summary:
      'Pas-à-pas simples pour ajouter un TP à partir d’un modèle (preset) et gérer le matériel du laboratoire.',
    sections: [
      {
        heading: 'Ajouter un TP via un modèle (preset) · Cahier',
        points: [
          'Ouvrir Cahier: menu → Cahier (/cahier)',
          'Cliquer “Nouveau TP” puis choisir la méthode Modèle (preset)',
          'Rechercher et sélectionner le modèle souhaité',
          'Adapter les réactifs, quantités et matériel si nécessaire',
          'Valider puis planifier la séance dans le calendrier',
        ],
      },
      {
        heading: 'Gérer le matériel',
        points: [
          'Accéder au module Matériel (/materiel)',
          'Ajouter / éditer des équipements et leurs catégories',
          'Renseigner les quantités et localisations',
          'Utiliser la recherche et les filtres (discipline, catégorie)',
          'Associer le matériel lors de l\'ajout d’un TP',
        ],
      },
    ],
  },
  {
    id: 'calendrier',
    title: 'Calendrier & Planification',
    keywords: ['calendrier', 'planning', 'planification', 'événement', 'evenement', 'slots'],
    summary:
      'Ajout, édition, diff et synchronisation des séances avec ressources et créneaux multi-classes/salles.',
    sections: [
      {
        heading: 'Objectifs clés',
        points: [
          'Assistant multi-étapes (CreateEventDialog / EditEventDialog)',
          'Ressources unifiées via AddResourcesDialog (catalogue + perso)',
          'Diff + signatures pour éviter faux positifs',
          'Undo sur éléments retirés',
          'Synchronisation PUT + fallback',
          'Sanitisation des entrées',
        ],
      },
      {
        heading: 'Flux d\'ajout',
        points: [
          'Méthode (file | manual | preset)',
          'Description & remarques (éditeur riche)',
          'Créneaux: agrégation classes & salles',
          'Ressources: matériel + réactifs',
          'Documents: upload multi-fichiers',
        ],
      },
      {
        heading: 'Signatures',
        points: ['Structure JSON triée', 'Comparaison déterministe', 'Ignorer re-renders neutres'],
      },
      {
        heading: 'Undo & Persistance visuelle',
        points: [
          'Caches meta pour preset supprimés',
          'Tracking par nom pour custom',
          'Chips barrées réintégrables',
        ],
      },
      {
        heading: 'Edge cases',
        points: [
          'Quantités invalides => valeur par défaut',
          'Unités vides => g',
          'Duplication noms custom évitée',
          'Mode Physique sans réactifs',
        ],
      },
    ],
  },
  {
    id: 'reactifs',
    title: 'Réactifs (Inventaire & Utilisation)',
    keywords: ['reactifs', 'réactifs', 'chimie', 'inventory', 'stock', 'hazard'],
    summary:
      'Gestion des réactifs chimiques: catalogue, unités, quantités demandées par séance, différenciation preset vs custom.',
    sections: [
      {
        heading: 'Concepts',
        points: [
          'Preset: lié à un identifiant existant (reactifId)',
          'Custom: spécifique à un événement (ReactifEventRequest)',
          'Unités normalisées (g par défaut)',
          'Quantité demandée != stock réel',
        ],
      },
      {
        heading: 'Interactions UI',
        points: [
          'Autocomplete catalogue',
          'Chips (preset) + champs quantité/unité',
          'Ajout custom rapide (nom, quantité, unité)',
          'Undo sur suppressions',
        ],
      },
      {
        heading: 'Synchronisation',
        points: [
          'Preset via update PUT /api/events/:id',
          'Custom via service diff (create/update/delete)',
          'Fallback delete+recreate si PUT indisponible',
        ],
      },
    ],
  },
  {
    id: 'materiel',
    title: 'Matériel (Équipement de laboratoire)',
    keywords: ['materiel', 'équipement', 'equipment', 'physique', 'chimie'],
    summary:
      'Catalogue du matériel avec filtrage par discipline, quantités demandées par séance et ajouts custom.',
    sections: [
      {
        heading: 'Sélection',
        points: [
          'Autocomplete multi-sélection',
          'Quantité min = 1',
          'Préservation quantités lors du re-select',
        ],
      },
      {
        heading: 'Custom',
        points: ['Ajout rapide (nom + quantité)', 'Remplacement si même nom', 'Undo persistant'],
      },
    ],
  },
  {
    id: 'notebook',
    title: 'Cahiers / Documents',
    keywords: ['cahier', 'notebook', 'documents', 'upload', 'protocoles'],
    summary:
      'Gestion des pièces jointes (protocoles, fiches sécurité) via FileUploadSection avec métadonnées simples.',
    sections: [
      {
        heading: 'Upload',
        points: [
          'Multi-fichiers (5)',
          'Types restreints (PDF, images, texte)',
          'Extraction URL pour stockage',
        ],
      },
      {
        heading: 'Persistance',
        points: ['Documents envoyés dans payload event', 'Suppression via chip onDelete'],
      },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications & Changements',
    keywords: ['notifications', 'snackbar', 'ressources mises à jour', 'signatures'],
    summary:
      'Stratégie de réduction du bruit: snackbar seulement sur modifications réelles détectées par signature.',
    sections: [
      {
        heading: 'Mécanisme',
        points: [
          'Signature avant/après diff',
          'Emission snackbar conditionnelle',
          'Message spécifique (succès / aucune modification)',
        ],
      },
    ],
  },
];

export function docsCorpus(): string {
  return modules
    .map((m) =>
      [m.title, m.summary, ...m.sections.flatMap((s) => [s.heading, ...s.points])].join(' '),
    )
    .join(' ');
}
