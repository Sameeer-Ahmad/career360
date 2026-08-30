-- AlterTable
ALTER TABLE `Document` ADD COLUMN `masterDocumentId` INTEGER NULL,
    ADD COLUMN `resumeRole` ENUM('MAIN', 'MASTER') NULL;

-- CreateIndex
CREATE INDEX `Document_masterDocumentId_idx` ON `Document`(`masterDocumentId`);

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_masterDocumentId_fkey` FOREIGN KEY (`masterDocumentId`) REFERENCES `Document`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: every existing standalone (non-tailored) resume predates the
-- Main/Master distinction. Default them all to MAIN so they keep showing up
-- in the workspace exactly as before this migration — users can re-tag any
-- of them to MASTER afterward via the document edit form.
UPDATE `Document`
SET `resumeRole` = 'MAIN'
WHERE `type` = 'RESUME' AND `sourceDocumentId` IS NULL AND `resumeRole` IS NULL;
