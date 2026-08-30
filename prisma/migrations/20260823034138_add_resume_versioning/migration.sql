-- AlterTable
ALTER TABLE `Document` ADD COLUMN `applicationId` INTEGER NULL,
    ADD COLUMN `contentFormat` ENUM('PLAIN', 'LATEX') NOT NULL DEFAULT 'PLAIN',
    ADD COLUMN `sourceDocumentId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `Document_sourceDocumentId_idx` ON `Document`(`sourceDocumentId`);

-- CreateIndex
CREATE INDEX `Document_applicationId_idx` ON `Document`(`applicationId`);

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_sourceDocumentId_fkey` FOREIGN KEY (`sourceDocumentId`) REFERENCES `Document`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `Application`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
