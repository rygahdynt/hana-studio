-- AlterTable
ALTER TABLE "renders" ADD COLUMN "slide_count" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "caption_snapshot" TEXT,
ADD COLUMN "thumbnail_key" TEXT;

-- CreateIndex
CREATE INDEX "renders_user_id_created_at_idx" ON "renders"("user_id", "created_at");
