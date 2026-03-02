-- Adiciona EM_COLETA ao enum StatusCarga
ALTER TYPE "StatusCarga" ADD VALUE IF NOT EXISTS 'EM_COLETA';
