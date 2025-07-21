-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');

-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('ML', 'L', 'G', 'KG', 'MG', 'MOL', 'PIECE');

-- CreateEnum
CREATE TYPE "ChemicalStatus" AS ENUM ('IN_STOCK', 'LOW_STOCK', 'OPENED', 'EXPIRED', 'EMPTY', 'QUARANTINE');

-- CreateEnum
CREATE TYPE "HazardClass" AS ENUM ('EXPLOSIVE', 'FLAMMABLE', 'OXIDIZING', 'TOXIC', 'CORROSIVE', 'IRRITANT', 'CARCINOGENIC', 'ENVIRONMENTAL');

-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('GLASSWARE', 'HEATING', 'MEASURING', 'SAFETY', 'MIXING', 'FILTRATION', 'OPTICAL', 'ELECTRONIC', 'OTHER');

-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'BROKEN', 'RETIRED');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'CALIBRATION', 'CLEANING');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'SENT', 'CONFIRMED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotebookStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CalendarType" AS ENUM ('TP', 'MAINTENANCE', 'INVENTORY', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "class" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chemicals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formula" TEXT,
    "molfile" TEXT,
    "casNumber" TEXT,
    "barcode" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" "Unit" NOT NULL,
    "minQuantity" DOUBLE PRECISION,
    "concentration" DOUBLE PRECISION,
    "purity" DOUBLE PRECISION,
    "purchaseDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "openedDate" TIMESTAMP(3),
    "storage" TEXT,
    "room" TEXT,
    "cabinet" TEXT,
    "shelf" TEXT,
    "hazardClass" "HazardClass",
    "sdsFileUrl" TEXT,
    "supplierId" TEXT,
    "batchNumber" TEXT,
    "orderReference" TEXT,
    "status" "ChemicalStatus" NOT NULL DEFAULT 'IN_STOCK',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chemicals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EquipmentType" NOT NULL,
    "model" TEXT,
    "serialNumber" TEXT,
    "barcode" TEXT,
    "quantity" INTEGER NOT NULL,
    "status" "EquipmentStatus" NOT NULL DEFAULT 'AVAILABLE',
    "location" TEXT,
    "room" TEXT,
    "cabinet" TEXT,
    "lastMaintenance" TIMESTAMP(3),
    "nextMaintenance" TIMESTAMP(3),
    "maintenanceNotes" TEXT,
    "supplierId" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "warrantyEnd" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_logs" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "description" TEXT NOT NULL,
    "cost" DOUBLE PRECISION,
    "performedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderDate" TIMESTAMP(3),
    "deliveryDate" TIMESTAMP(3),
    "totalAmount" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "chemicalId" TEXT,
    "equipmentId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION,
    "totalPrice" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notebook_entries" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "protocolFileUrl" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER,
    "class" TEXT NOT NULL,
    "groups" TEXT[],
    "createdById" TEXT NOT NULL,
    "objectives" TEXT,
    "procedure" TEXT,
    "observations" TEXT,
    "results" TEXT,
    "calculations" TEXT,
    "conclusions" TEXT,
    "images" TEXT[],
    "attachments" TEXT[],
    "studentSigned" BOOLEAN NOT NULL DEFAULT false,
    "teacherSigned" BOOLEAN NOT NULL DEFAULT false,
    "signedAt" TIMESTAMP(3),
    "status" "NotebookStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notebook_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notebook_chemicals" (
    "id" TEXT NOT NULL,
    "notebookId" TEXT NOT NULL,
    "chemicalId" TEXT NOT NULL,
    "quantityUsed" DOUBLE PRECISION NOT NULL,
    "unit" "Unit" NOT NULL,
    "notes" TEXT,

    CONSTRAINT "notebook_chemicals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notebook_equipment" (
    "id" TEXT NOT NULL,
    "notebookId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,

    CONSTRAINT "notebook_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "class" TEXT,
    "room" TEXT,
    "type" "CalendarType" NOT NULL,
    "notebookId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldData" JSONB,
    "newData" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AssignedTo" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AssignedTo_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "chemicals_barcode_key" ON "chemicals"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_serialNumber_key" ON "materiel"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_barcode_key" ON "materiel"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "_AssignedTo_B_index" ON "_AssignedTo"("B");

-- AddForeignKey
ALTER TABLE "chemicals" ADD CONSTRAINT "chemicals_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiel" ADD CONSTRAINT "equipment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "materiel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_chemicalId_fkey" FOREIGN KEY ("chemicalId") REFERENCES "chemicals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "materiel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notebook_entries" ADD CONSTRAINT "notebook_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notebook_chemicals" ADD CONSTRAINT "notebook_chemicals_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "notebook_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notebook_chemicals" ADD CONSTRAINT "notebook_chemicals_chemicalId_fkey" FOREIGN KEY ("chemicalId") REFERENCES "chemicals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notebook_equipment" ADD CONSTRAINT "notebook_equipment_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "notebook_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notebook_equipment" ADD CONSTRAINT "notebook_equipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "materiel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssignedTo" ADD CONSTRAINT "_AssignedTo_A_fkey" FOREIGN KEY ("A") REFERENCES "notebook_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssignedTo" ADD CONSTRAINT "_AssignedTo_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
