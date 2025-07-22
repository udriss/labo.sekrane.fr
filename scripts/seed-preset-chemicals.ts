import { PrismaClient, HazardClass, PhysicalState } from "@prisma/client";

const prisma = new PrismaClient();

const presetChemicals = [
  // Acides
  {
    name: "Acide chlorhydrique",
    formula: "HCl",
    casNumber: "7647-01-0",
    molarMass: 36.46,
    boilingPoint: -85.05,
    meltingPoint: -114.22,
    density: 1.2,
    hazardClass: HazardClass.CORROSIVE,
    physicalState: PhysicalState.LIQUID,
    categories: ["Acides", "Corrosifs"],
    safetyNotes: "Corrosif, porter des EPI complets. Utiliser sous hotte.",
    commonUses: "Ajustement de pH, nettoyage, synthèse organique"
  },
  {
    name: "Acide sulfurique",
    formula: "H₂SO₄",
    casNumber: "7664-93-9",
    molarMass: 98.08,
    boilingPoint: 337,
    meltingPoint: 10,
    density: 1.84,
    hazardClass: HazardClass.CORROSIVE,
    physicalState: PhysicalState.LIQUID,
    categories: ["Acides", "Corrosifs"],
    safetyNotes: "Extrêmement corrosif, réaction violente avec l'eau. Toujours ajouter l'acide à l'eau.",
    commonUses: "Synthèse, déshydratation, catalyseur"
  },
  {
    name: "Acide nitrique",
    formula: "HNO₃",
    casNumber: "7697-37-2",
    molarMass: 63.01,
    boilingPoint: 83,
    meltingPoint: -42,
    density: 1.51,
    hazardClass: HazardClass.OXIDIZING,
    physicalState: PhysicalState.LIQUID,
    categories: ["Acides", "Oxydants"],
    safetyNotes: "Corrosif et oxydant, éviter le contact avec les matières organiques.",
    commonUses: "Nitration, gravure, synthèse"
  },
  {
    name: "Acide acétique",
    formula: "CH₃COOH",
    casNumber: "64-19-7",
    molarMass: 60.05,
    boilingPoint: 118,
    meltingPoint: 17,
    density: 1.05,
    hazardClass: HazardClass.CORROSIVE,
    physicalState: PhysicalState.LIQUID,
    categories: ["Acides", "Organiques"],
    safetyNotes: "Vapeurs irritantes, utiliser sous hotte.",
    commonUses: "Synthèse organique, solutions tampons"
  },
  
  // Bases
  {
    name: "Hydroxyde de sodium",
    formula: "NaOH",
    casNumber: "1310-73-2",
    molarMass: 40.00,
    boilingPoint: 1388,
    meltingPoint: 318,
    density: 2.13,
    hazardClass: HazardClass.CORROSIVE,
    physicalState: PhysicalState.SOLID,
    categories: ["Bases", "Corrosifs"],
    safetyNotes: "Très corrosif, dégage de la chaleur en solution.",
    commonUses: "Ajustement de pH, saponification, nettoyage"
  },
  {
    name: "Hydroxyde de potassium",
    formula: "KOH",
    casNumber: "1310-58-3",
    molarMass: 56.11,
    boilingPoint: 1327,
    meltingPoint: 361,
    density: 2.04,
    hazardClass: HazardClass.CORROSIVE,
    physicalState: PhysicalState.SOLID,
    categories: ["Bases", "Corrosifs"],
    safetyNotes: "Très corrosif, hygroscopique.",
    commonUses: "Synthèse organique, électrolyte"
  },
  {
    name: "Ammoniaque",
    formula: "NH₃",
    casNumber: "7664-41-7",
    molarMass: 17.03,
    boilingPoint: -33.34,
    meltingPoint: -77.73,
    density: 0.73,
    hazardClass: HazardClass.TOXIC,
    physicalState: PhysicalState.GAS,
    categories: ["Bases", "Gaz"],
    safetyNotes: "Gaz toxique et irritant, utiliser sous hotte.",
    commonUses: "Solutions tampons, synthèse"
  },

  // Solvants organiques
  {
    name: "Éthanol",
    formula: "C₂H₅OH",
    casNumber: "64-17-5",
    molarMass: 46.07,
    boilingPoint: 78.37,
    meltingPoint: -114.14,
    density: 0.79,
    hazardClass: HazardClass.FLAMMABLE,
    physicalState: PhysicalState.LIQUID,
    categories: ["Alcools", "Solvants"],
    safetyNotes: "Inflammable, tenir à l'écart des sources d'ignition.",
    commonUses: "Solvant, désinfectant, synthèse"
  },
  {
    name: "Méthanol",
    formula: "CH₃OH",
    casNumber: "67-56-1",
    molarMass: 32.04,
    boilingPoint: 64.7,
    meltingPoint: -97.6,
    density: 0.79,
    hazardClass: HazardClass.TOXIC,
    physicalState: PhysicalState.LIQUID,
    categories: ["Alcools", "Solvants"],
    safetyNotes: "Toxique, inflammable, éviter l'inhalation.",
    commonUses: "Solvant, carburant, synthèse"
  },
  {
    name: "Acétone",
    formula: "C₃H₆O",
    casNumber: "67-64-1",
    molarMass: 58.08,
    boilingPoint: 56.05,
    meltingPoint: -94.7,
    density: 0.78,
    hazardClass: HazardClass.FLAMMABLE,
    physicalState: PhysicalState.LIQUID,
    categories: ["Cétones", "Solvants"],
    safetyNotes: "Très inflammable, vapeurs narcotiques.",
    commonUses: "Solvant, dégraissage, synthèse"
  },
  {
    name: "Dichlorométhane",
    formula: "CH₂Cl₂",
    casNumber: "75-09-2",
    molarMass: 84.93,
    boilingPoint: 39.6,
    meltingPoint: -96.7,
    density: 1.33,
    hazardClass: HazardClass.CARCINOGENIC,
    physicalState: PhysicalState.LIQUID,
    categories: ["Solvants", "Halogénés"],
    safetyNotes: "Cancérogène suspecté, utiliser sous hotte.",
    commonUses: "Extraction, chromatographie"
  },
  {
    name: "Chloroforme",
    formula: "CHCl₃",
    casNumber: "67-66-3",
    molarMass: 119.38,
    boilingPoint: 61.15,
    meltingPoint: -63.5,
    density: 1.48,
    hazardClass: HazardClass.CARCINOGENIC,
    physicalState: PhysicalState.LIQUID,
    categories: ["Solvants", "Halogénés"],
    safetyNotes: "Cancérogène, narcotique, utiliser sous hotte.",
    commonUses: "Extraction, RMN"
  },

  // Indicateurs
  {
    name: "Phénolphtaléine",
    formula: "C₂₀H₁₄O₄",
    casNumber: "77-09-8",
    molarMass: 318.32,
    meltingPoint: 258,
    density: 1.28,
    hazardClass: HazardClass.IRRITANT,
    physicalState: PhysicalState.SOLID,
    categories: ["Indicateurs", "Organiques"],
    safetyNotes: "Irritant, éviter l'inhalation de poussières.",
    commonUses: "Indicateur pH, titrages acide-base"
  },
  {
    name: "Bleu de bromothymol",
    formula: "C₂₇H₂₈Br₂O₅S",
    casNumber: "76-59-5",
    molarMass: 624.38,
    physicalState: PhysicalState.SOLID,
    categories: ["Indicateurs", "Organiques"],
    safetyNotes: "Irritant léger.",
    commonUses: "Indicateur pH (6.0-7.6)"
  },

  // Sels
  {
    name: "Chlorure de sodium",
    formula: "NaCl",
    casNumber: "7647-14-5",
    molarMass: 58.44,
    boilingPoint: 1465,
    meltingPoint: 801,
    density: 2.16,
    physicalState: PhysicalState.SOLID,
    categories: ["Sels", "Inorganiques"],
    safetyNotes: "Non dangereux en usage normal.",
    commonUses: "Ajustement de force ionique, électrolyse"
  },
  {
    name: "Sulfate de cuivre pentahydraté",
    formula: "CuSO₄·5H₂O",
    casNumber: "7758-99-8",
    molarMass: 249.68,
    meltingPoint: 110,
    density: 2.28,
    hazardClass: HazardClass.IRRITANT,
    physicalState: PhysicalState.SOLID,
    categories: ["Sels", "Inorganiques"],
    safetyNotes: "Irritant, nocif par ingestion.",
    commonUses: "Catalyseur, fongicide, électrolyse"
  },

  // Oxydants
  {
    name: "Permanganate de potassium",
    formula: "KMnO₄",
    casNumber: "7722-64-7",
    molarMass: 158.03,
    meltingPoint: 240,
    density: 2.70,
    hazardClass: HazardClass.OXIDIZING,
    physicalState: PhysicalState.SOLID,
    categories: ["Oxydants", "Sels"],
    safetyNotes: "Oxydant fort, éviter le contact avec matières organiques.",
    commonUses: "Oxydation, désinfectant, titrages"
  },
  {
    name: "Peroxyde d'hydrogène",
    formula: "H₂O₂",
    casNumber: "7722-84-1",
    molarMass: 34.01,
    boilingPoint: 150.2,
    meltingPoint: -0.43,
    density: 1.44,
    hazardClass: HazardClass.OXIDIZING,
    physicalState: PhysicalState.LIQUID,
    categories: ["Oxydants", "Inorganiques"],
    safetyNotes: "Oxydant, se décompose à la lumière.",
    commonUses: "Oxydation, blanchiment, désinfectant"
  },

  // Gaz
  {
    name: "Dihydrogène",
    formula: "H₂",
    casNumber: "1333-74-0",
    molarMass: 2.02,
    boilingPoint: -252.87,
    meltingPoint: -259.16,
    density: 0.09,
    hazardClass: HazardClass.FLAMMABLE,
    physicalState: PhysicalState.GAS,
    categories: ["Gaz", "Réducteurs"],
    safetyNotes: "Très inflammable, risque d'explosion.",
    commonUses: "Hydrogénation, réduction, pile à combustible"
  },
  {
    name: "Dioxygène",
    formula: "O₂",
    casNumber: "7782-44-7",
    molarMass: 32.00,
    boilingPoint: -182.96,
    meltingPoint: -218.79,
    density: 1.43,
    hazardClass: HazardClass.OXIDIZING,
    physicalState: PhysicalState.GAS,
    categories: ["Gaz", "Oxydants"],
    safetyNotes: "Comburant, favorise la combustion.",
    commonUses: "Combustion, oxydation, respiration"
  }
];

const categories = [
  { name: "Acides", description: "Composés donneurs de protons", color: "#f44336", sortOrder: 1 },
  { name: "Bases", description: "Composés accepteurs de protons", color: "#2196f3", sortOrder: 2 },
  { name: "Sels", description: "Composés ioniques", color: "#4caf50", sortOrder: 3 },
  { name: "Oxydants", description: "Agents oxydants", color: "#ff9800", sortOrder: 4 },
  { name: "Réducteurs", description: "Agents réducteurs", color: "#9c27b0", sortOrder: 5 },
  { name: "Solvants", description: "Liquides de dissolution", color: "#00bcd4", sortOrder: 6 },
  { name: "Alcools", description: "Composés hydroxylés", color: "#8bc34a", sortOrder: 7 },
  { name: "Cétones", description: "Composés carbonylés", color: "#ffeb3b", sortOrder: 8 },
  { name: "Indicateurs", description: "Indicateurs colorés", color: "#e91e63", sortOrder: 9 },
  { name: "Organiques", description: "Composés organiques", color: "#795548", sortOrder: 10 },
  { name: "Inorganiques", description: "Composés inorganiques", color: "#607d8b", sortOrder: 11 },
  { name: "Halogénés", description: "Composés halogénés", color: "#ff5722", sortOrder: 12 },
  { name: "Gaz", description: "État gazeux", color: "#9e9e9e", sortOrder: 13 },
  { name: "Corrosifs", description: "Composés corrosifs", color: "#ff1744", sortOrder: 14 }
];

async function seedPresetChemicals() {
  console.log("🌱 Début du seeding des molécules prédéfinies...");

  try {
    // Créer les catégories
    console.log("📁 Création des catégories...");
    const createdCategories = new Map();
    
    for (const category of categories) {
      const created = await prisma.chemicalCategory.upsert({
        where: { name: category.name },
        update: category,
        create: category,
      });
      createdCategories.set(category.name, created);
      console.log(`  ✅ Catégorie créée: ${category.name}`);
    }

    // Créer les molécules prédéfinies
    console.log("🧪 Création des molécules prédéfinies...");
    
    for (const chemical of presetChemicals) {
      const { categories: chemicalCategories, ...chemicalData } = chemical;
      
      const categoryConnections = chemicalCategories.map(catName => ({
        id: createdCategories.get(catName)?.id
      })).filter(cat => cat.id);

      await prisma.presetChemical.upsert({
        where: { casNumber: chemical.casNumber || `generated-${chemical.name}` },
        update: {
          ...chemicalData,
          categories: {
            set: categoryConnections
          }
        },
        create: {
          ...chemicalData,
          categories: {
            connect: categoryConnections
          }
        },
      });
      
      console.log(`  ✅ Molécule créée: ${chemical.name}`);
    }

    console.log("🎉 Seeding terminé avec succès!");
    console.log(`📊 Statistiques:`);
    console.log(`   - ${categories.length} catégories créées`);
    console.log(`   - ${presetChemicals.length} molécules créées`);

  } catch (error) {
    console.error("❌ Erreur lors du seeding:", error);
    throw error;
  }
}

// Exécution du script si appelé directement
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  seedPresetChemicals()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedPresetChemicals };
