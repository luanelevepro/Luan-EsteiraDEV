-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ops";

-- CreateEnum
CREATE TYPE "ops"."TaskStatus" AS ENUM ('PENDING', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ops"."RunReason" AS ENUM ('SCHEDULED', 'MANUAL', 'RERUN');

-- CreateTable
CREATE TABLE "ops"."ops_task_type" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_code" TEXT NOT NULL,
    "ds_title" TEXT NOT NULL,

    CONSTRAINT "ops_task_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops"."ops_task_template" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_code" TEXT NOT NULL,
    "ds_title" TEXT NOT NULL,
    "id_task_type" TEXT NOT NULL,
    "js_defaults" JSONB,
    "vl_priority" INTEGER NOT NULL DEFAULT 5,
    "fl_is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ops_task_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops"."ops_task_group" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_code" TEXT NOT NULL,
    "ds_title" TEXT NOT NULL,
    "fl_is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ops_task_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops"."ops_task_group_item" (
    "id" TEXT NOT NULL,
    "id_task_group" TEXT NOT NULL,
    "id_task_template" TEXT NOT NULL,
    "vl_order" INTEGER NOT NULL,

    CONSTRAINT "ops_task_group_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops"."ops_task_batch" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_reason" "ops"."RunReason" NOT NULL DEFAULT 'MANUAL',
    "id_created_by" TEXT,
    "ds_note" TEXT,

    CONSTRAINT "ops_task_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops"."ops_task" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_company" TEXT NOT NULL,
    "id_task_type" TEXT NOT NULL,
    "id_task_template" TEXT,
    "id_task_group" TEXT,
    "id_task_batch" TEXT,
    "js_payload" JSONB,
    "js_derived_payload" JSONB,
    "ds_status" "ops"."TaskStatus" NOT NULL DEFAULT 'PENDING',
    "vl_priority" INTEGER NOT NULL DEFAULT 5,
    "dt_scheduled" TIMESTAMP(3),
    "dt_queued" TIMESTAMP(3),
    "dt_started" TIMESTAMP(3),
    "dt_finished" TIMESTAMP(3),
    "ds_last_error" TEXT,
    "ds_idempotency" TEXT,
    "ds_concurrency_key" TEXT,
    "ds_reason" "ops"."RunReason" NOT NULL DEFAULT 'SCHEDULED',

    CONSTRAINT "ops_task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops"."ops_task_run" (
    "id" TEXT NOT NULL,
    "id_task" TEXT NOT NULL,
    "vl_attempt" INTEGER NOT NULL DEFAULT 1,
    "ds_status" "ops"."TaskStatus" NOT NULL,
    "dt_started" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_finished" TIMESTAMP(3),
    "js_metrics" JSONB,
    "ds_error" TEXT,

    CONSTRAINT "ops_task_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops"."ops_task_schedule" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_company" TEXT,
    "id_task_template" TEXT,
    "id_task_group" TEXT,
    "ds_cron" TEXT,
    "vl_every_ms" INTEGER,
    "fl_is_active" BOOLEAN NOT NULL DEFAULT true,
    "fl_dedupe_concurrency_key" BOOLEAN NOT NULL DEFAULT true,
    "js_payload_overrides" JSONB,
    "vl_priority_default" INTEGER,

    CONSTRAINT "ops_task_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ops_task_type_ds_code_key" ON "ops"."ops_task_type"("ds_code");

-- CreateIndex
CREATE UNIQUE INDEX "ops_task_template_ds_code_key" ON "ops"."ops_task_template"("ds_code");

-- CreateIndex
CREATE UNIQUE INDEX "ops_task_group_ds_code_key" ON "ops"."ops_task_group"("ds_code");

-- CreateIndex
CREATE UNIQUE INDEX "ops_task_ds_idempotency_key" ON "ops"."ops_task"("ds_idempotency");

-- CreateIndex
CREATE UNIQUE INDEX "ops_task_ds_concurrency_key_key" ON "ops"."ops_task"("ds_concurrency_key");

-- CreateIndex
CREATE INDEX "ops_task_id_company_ds_status_idx" ON "ops"."ops_task"("id_company", "ds_status");

-- CreateIndex
CREATE INDEX "ops_task_id_task_type_ds_status_idx" ON "ops"."ops_task"("id_task_type", "ds_status");

-- CreateIndex
CREATE INDEX "ops_task_dt_scheduled_idx" ON "ops"."ops_task"("dt_scheduled");

-- CreateIndex
CREATE INDEX "ops_task_vl_priority_idx" ON "ops"."ops_task"("vl_priority");

-- CreateIndex
CREATE INDEX "ops_task_run_id_task_idx" ON "ops"."ops_task_run"("id_task");

-- AddForeignKey
ALTER TABLE "ops"."ops_task_template" ADD CONSTRAINT "ops_task_template_id_task_type_fkey" FOREIGN KEY ("id_task_type") REFERENCES "ops"."ops_task_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops"."ops_task_group_item" ADD CONSTRAINT "ops_task_group_item_id_task_group_fkey" FOREIGN KEY ("id_task_group") REFERENCES "ops"."ops_task_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops"."ops_task_group_item" ADD CONSTRAINT "ops_task_group_item_id_task_template_fkey" FOREIGN KEY ("id_task_template") REFERENCES "ops"."ops_task_template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops"."ops_task" ADD CONSTRAINT "ops_task_id_task_type_fkey" FOREIGN KEY ("id_task_type") REFERENCES "ops"."ops_task_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops"."ops_task" ADD CONSTRAINT "ops_task_id_task_template_fkey" FOREIGN KEY ("id_task_template") REFERENCES "ops"."ops_task_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops"."ops_task" ADD CONSTRAINT "ops_task_id_task_group_fkey" FOREIGN KEY ("id_task_group") REFERENCES "ops"."ops_task_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops"."ops_task" ADD CONSTRAINT "ops_task_id_task_batch_fkey" FOREIGN KEY ("id_task_batch") REFERENCES "ops"."ops_task_batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops"."ops_task_run" ADD CONSTRAINT "ops_task_run_id_task_fkey" FOREIGN KEY ("id_task") REFERENCES "ops"."ops_task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
