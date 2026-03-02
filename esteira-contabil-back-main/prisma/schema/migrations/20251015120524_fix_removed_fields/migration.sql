/*
  Warnings:

  - Added the required column `cd_fipe_tracionador` to the `emb_frota` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "emb_frota" ADD COLUMN     "cd_fipe_tracionador" TEXT NOT NULL;
