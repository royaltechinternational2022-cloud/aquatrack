-- CreateEnum
CREATE TYPE "MeterReadingType" AS ENUM ('OPENING', 'CLOSING');

-- CreateTable
CREATE TABLE "MeterReading" (
    "id" TEXT NOT NULL,
    "businessDate" TEXT NOT NULL,
    "type" "MeterReadingType" NOT NULL,
    "reading" DOUBLE PRECISION NOT NULL,
    "recordedById" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeterReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeterReading_businessDate_type_key" ON "MeterReading"("businessDate", "type");

-- AddForeignKey
ALTER TABLE "MeterReading" ADD CONSTRAINT "MeterReading_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
