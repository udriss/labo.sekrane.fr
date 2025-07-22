-- CreateEnum
CREATE TYPE "PhysicalState" AS ENUM ('SOLID', 'LIQUID', 'GAS', 'PLASMA');

-- CreateTable
CREATE TABLE "preset_chemicals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formula" TEXT,
    "casNumber" TEXT,
    "molarMass" DOUBLE PRECISION,
    "boilingPoint" DOUBLE PRECISION,
    "meltingPoint" DOUBLE PRECISION,
    "density" DOUBLE PRECISION,
    "hazardClass" "HazardClass",
    "physicalState" "PhysicalState" NOT NULL DEFAULT 'LIQUID',
    "safetyNotes" TEXT,
    "commonUses" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preset_chemicals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chemical_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chemical_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ChemicalCategoryToPresetChemical" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ChemicalCategoryToPresetChemical_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "preset_chemicals_casNumber_key" ON "preset_chemicals"("casNumber");

-- CreateIndex
CREATE UNIQUE INDEX "chemical_categories_name_key" ON "chemical_categories"("name");

-- CreateIndex
CREATE INDEX "_ChemicalCategoryToPresetChemical_B_index" ON "_ChemicalCategoryToPresetChemical"("B");

-- AddForeignKey
ALTER TABLE "_ChemicalCategoryToPresetChemical" ADD CONSTRAINT "_ChemicalCategoryToPresetChemical_A_fkey" FOREIGN KEY ("A") REFERENCES "chemical_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChemicalCategoryToPresetChemical" ADD CONSTRAINT "_ChemicalCategoryToPresetChemical_B_fkey" FOREIGN KEY ("B") REFERENCES "preset_chemicals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
