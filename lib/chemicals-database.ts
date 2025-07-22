// Base de données des composés chimiques communs pour l'auto-complétion
export interface ChemicalCompound {
  name: string
  formula: string
  casNumber: string
  aliases?: string[] // Noms alternatifs
  category?: string
  hazardClass?: string
  density?: number // g/cm³
  molarMass?: number // g/mol
}

export const COMMON_CHEMICALS: ChemicalCompound[] = [
  // Acides
  {
    name: "Acide chlorhydrique",
    formula: "HCl",
    casNumber: "7647-01-0",
    aliases: ["Chlorure d'hydrogène", "Acide muriatique"],
    category: "Acide",
    hazardClass: "Corrosif",
    molarMass: 36.46
  },
  {
    name: "Acide sulfurique",
    formula: "H₂SO₄",
    casNumber: "7664-93-9",
    aliases: ["Huile de vitriol"],
    category: "Acide",
    hazardClass: "Corrosif",
    molarMass: 98.08
  },
  {
    name: "Acide nitrique",
    formula: "HNO₃",
    casNumber: "7697-37-2",
    aliases: ["Eau forte"],
    category: "Acide",
    hazardClass: "Corrosif, Oxydant",
    molarMass: 63.01
  },
  {
    name: "Acide acétique",
    formula: "CH₃COOH",
    casNumber: "64-19-7",
    aliases: ["Acide éthanoïque", "Vinaigre blanc"],
    category: "Acide",
    hazardClass: "Corrosif",
    molarMass: 60.05
  },
  {
    name: "Acide phosphorique",
    formula: "H₃PO₄",
    casNumber: "7664-38-2",
    category: "Acide",
    hazardClass: "Corrosif",
    molarMass: 97.99
  },

  // Bases
  {
    name: "Hydroxyde de sodium",
    formula: "NaOH",
    casNumber: "1310-73-2",
    aliases: ["Soude caustique", "Lessive de soude"],
    category: "Base",
    hazardClass: "Corrosif",
    molarMass: 39.997
  },
  {
    name: "Hydroxyde de potassium",
    formula: "KOH",
    casNumber: "1310-58-3",
    aliases: ["Potasse caustique"],
    category: "Base",
    hazardClass: "Corrosif",
    molarMass: 56.11
  },
  {
    name: "Hydroxyde de calcium",
    formula: "Ca(OH)₂",
    casNumber: "1305-62-0",
    aliases: ["Chaux éteinte", "Lait de chaux"],
    category: "Base",
    hazardClass: "Irritant",
    molarMass: 74.09
  },
  {
    name: "Ammoniaque",
    formula: "NH₃",
    casNumber: "7664-41-7",
    aliases: ["Ammoniac"],
    category: "Base",
    hazardClass: "Toxique, Corrosif",
    molarMass: 17.03
  },

  // Sels
  {
    name: "Chlorure de sodium",
    formula: "NaCl",
    casNumber: "7647-14-5",
    aliases: ["Sel de table", "Halite"],
    category: "Sel",
    molarMass: 58.44
  },
  {
    name: "Sulfate de cuivre",
    formula: "CuSO₄·5H₂O",
    casNumber: "7758-99-8",
    aliases: ["Sulfate de cuivre pentahydraté", "Vitriol bleu"],
    category: "Sel métallique",
    hazardClass: "Nocif",
    molarMass: 249.68
  },
  {
    name: "Nitrate d'argent",
    formula: "AgNO₃",
    casNumber: "7761-88-8",
    category: "Sel métallique",
    hazardClass: "Corrosif, Oxydant",
    molarMass: 169.87
  },
  {
    name: "Chlorure de fer III",
    formula: "FeCl₃",
    casNumber: "7705-08-0",
    aliases: ["Perchlorure de fer"],
    category: "Sel métallique",
    hazardClass: "Corrosif",
    molarMass: 162.2
  },

  // Solvants organiques
  {
    name: "Éthanol",
    formula: "C₂H₅OH",
    casNumber: "64-17-5",
    aliases: ["Alcool éthylique", "Esprit-de-vin"],
    category: "Alcool",
    hazardClass: "Inflammable",
    molarMass: 46.07
  },
  {
    name: "Méthanol",
    formula: "CH₃OH",
    casNumber: "67-56-1",
    aliases: ["Alcool méthylique", "Esprit-de-bois"],
    category: "Alcool",
    hazardClass: "Toxique, Inflammable",
    molarMass: 32.04
  },
  {
    name: "Acétone",
    formula: "C₃H₆O",
    casNumber: "67-64-1",
    aliases: ["Propanone"],
    category: "Cétone",
    hazardClass: "Inflammable",
    molarMass: 58.08
  },
  {
    name: "Dichlorométhane",
    formula: "CH₂Cl₂",
    casNumber: "75-09-2",
    aliases: ["Chlorure de méthylène"],
    category: "Solvant halogéné",
    hazardClass: "Toxique",
    molarMass: 84.93
  },
  {
    name: "Hexane",
    formula: "C₆H₁₄",
    casNumber: "110-54-3",
    category: "Alcane",
    hazardClass: "Inflammable, Toxique",
    molarMass: 86.18
  },

  // Indicateurs
  {
    name: "Bleu de bromothymol",
    formula: "C₂₇H₂₈Br₂O₅S",
    casNumber: "76-59-5",
    aliases: ["BTB"],
    category: "Indicateur coloré",
    molarMass: 624.38
  },
  {
    name: "Phénolphtaléine",
    formula: "C₂₀H₁₄O₄",
    casNumber: "77-09-8",
    category: "Indicateur coloré",
    molarMass: 318.32
  },
  {
    name: "Rouge de méthyle",
    formula: "C₁₅H₁₅N₃O₂",
    casNumber: "493-52-7",
    category: "Indicateur coloré",
    molarMass: 269.3
  },

  // Oxydants/Réducteurs
  {
    name: "Permanganate de potassium",
    formula: "KMnO₄",
    casNumber: "7722-64-7",
    category: "Oxydant",
    hazardClass: "Oxydant",
    molarMass: 158.03
  },
  {
    name: "Dichromate de potassium",
    formula: "K₂Cr₂O₇",
    casNumber: "7778-50-9",
    category: "Oxydant",
    hazardClass: "Cancérogène, Oxydant",
    molarMass: 294.18
  },
  {
    name: "Peroxyde d'hydrogène",
    formula: "H₂O₂",
    casNumber: "7722-84-1",
    aliases: ["Eau oxygénée"],
    category: "Oxydant",
    hazardClass: "Oxydant, Corrosif",
    molarMass: 34.01
  },

  // Composés organiques courants
  {
    name: "Glucose",
    formula: "C₆H₁₂O₆",
    casNumber: "50-99-7",
    aliases: ["Dextrose"],
    category: "Glucide",
    molarMass: 180.16
  },
  {
    name: "Saccharose",
    formula: "C₁₂H₂₂O₁₁",
    casNumber: "57-50-1",
    aliases: ["Sucre de table"],
    category: "Glucide",
    molarMass: 342.3
  },
  {
    name: "Urée",
    formula: "CO(NH₂)₂",
    casNumber: "57-13-6",
    aliases: ["Carbamide"],
    category: "Composé azoté",
    molarMass: 60.06
  },

  // Gaz (solutions)
  {
    name: "Dioxyde de carbone",
    formula: "CO₂",
    casNumber: "124-38-9",
    aliases: ["Gaz carbonique"],
    category: "Gaz",
    molarMass: 44.01
  },
  {
    name: "Dihydrogène",
    formula: "H₂",
    casNumber: "1333-74-0",
    aliases: ["Hydrogène"],
    category: "Gaz",
    hazardClass: "Inflammable",
    molarMass: 2.02
  },
  {
    name: "Dioxygène",
    formula: "O₂",
    casNumber: "7782-44-7",
    aliases: ["Oxygène"],
    category: "Gaz",
    hazardClass: "Comburant",
    molarMass: 32.00
  }
]

// Fonction de recherche pour l'auto-complétion
export function searchChemicals(query: string): ChemicalCompound[] {
  if (!query || query.length < 1) return []
  
  const searchTerm = query.toLowerCase().trim()
  
  return COMMON_CHEMICALS.filter(chemical => {
    // Recherche par nom
    const nameMatch = chemical.name.toLowerCase().includes(searchTerm)
    
    // Recherche par formule
    const formulaMatch = chemical.formula.toLowerCase().includes(searchTerm)
    
    // Recherche par numéro CAS
    const casMatch = chemical.casNumber.includes(searchTerm)
    
    // Recherche par aliases
    const aliasMatch = chemical.aliases?.some(alias => 
      alias.toLowerCase().includes(searchTerm)
    ) || false
    
    return nameMatch || formulaMatch || casMatch || aliasMatch
  }).slice(0, 10) // Limiter à 10 résultats
}

// Fonction pour rechercher par CAS exact
export function findByCAS(casNumber: string): ChemicalCompound | undefined {
  return COMMON_CHEMICALS.find(chemical => chemical.casNumber === casNumber)
}

// Fonction pour rechercher par nom exact
export function findByName(name: string): ChemicalCompound | undefined {
  const searchName = name.toLowerCase().trim()
  return COMMON_CHEMICALS.find(chemical => 
    chemical.name.toLowerCase() === searchName ||
    chemical.aliases?.some(alias => alias.toLowerCase() === searchName)
  )
}
