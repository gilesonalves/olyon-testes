-- Add slug to Store (unique)
ALTER TABLE "Store" ADD COLUMN "slug" TEXT;

-- Existing rows: use id as slug so we have unique non-null values
UPDATE "Store" SET "slug" = "id";

ALTER TABLE "Store" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");
