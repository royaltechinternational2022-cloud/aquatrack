-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "meterDiscrepancyThresholdPct" DOUBLE PRECISION NOT NULL DEFAULT 15,
ADD COLUMN     "meterReferencePricePerLiter" DOUBLE PRECISION NOT NULL DEFAULT 4;
