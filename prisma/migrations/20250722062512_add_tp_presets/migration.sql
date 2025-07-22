-- CreateTable
CREATE TABLE "tp_presets" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "objectives" TEXT,
    "procedure" TEXT,
    "duration" INTEGER,
    "level" TEXT,
    "subject" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "attachments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tp_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tp_preset_chemicals" (
    "id" TEXT NOT NULL,
    "tpPresetId" TEXT NOT NULL,
    "chemicalId" TEXT NOT NULL,
    "quantityUsed" DOUBLE PRECISION NOT NULL,
    "unit" "Unit" NOT NULL,
    "notes" TEXT,

    CONSTRAINT "tp_preset_chemicals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tp_preset_materials" (
    "id" TEXT NOT NULL,
    "tpPresetId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,

    CONSTRAINT "tp_preset_materials_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tp_presets" ADD CONSTRAINT "tp_presets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tp_preset_chemicals" ADD CONSTRAINT "tp_preset_chemicals_chemicalId_fkey" FOREIGN KEY ("chemicalId") REFERENCES "chemicals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tp_preset_chemicals" ADD CONSTRAINT "tp_preset_chemicals_tpPresetId_fkey" FOREIGN KEY ("tpPresetId") REFERENCES "tp_presets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tp_preset_materials" ADD CONSTRAINT "tp_preset_materials_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materiel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tp_preset_materials" ADD CONSTRAINT "tp_preset_materials_tpPresetId_fkey" FOREIGN KEY ("tpPresetId") REFERENCES "tp_presets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
