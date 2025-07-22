-- AlterTable
ALTER TABLE "materiel" RENAME CONSTRAINT "equipment_pkey" TO "materiel_pkey";

-- CreateTable
CREATE TABLE "user_classes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "room" TEXT,
    "cabinet" TEXT,
    "shelf" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configurable_lists" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configurable_lists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_classes_userId_className_key" ON "user_classes"("userId", "className");

-- CreateIndex
CREATE UNIQUE INDEX "locations_name_key" ON "locations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "configurable_lists_type_value_key" ON "configurable_lists"("type", "value");

-- RenameForeignKey
ALTER TABLE "materiel" RENAME CONSTRAINT "equipment_supplierId_fkey" TO "materiel_supplierId_fkey";

-- AddForeignKey
ALTER TABLE "user_classes" ADD CONSTRAINT "user_classes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "equipment_barcode_key" RENAME TO "materiel_barcode_key";

-- RenameIndex
ALTER INDEX "equipment_serialNumber_key" RENAME TO "materiel_serialNumber_key";
