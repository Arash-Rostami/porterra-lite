-- porterra-lite — full schema, current state
--
-- Source of truth for a fresh database. Generated from `SHOW CREATE TABLE` against
-- the live dev database on 2026-08-20, plus the category foreign keys documented as
-- the intended design (see note below and db/README.md's "Migration history" section).
--
-- Applied automatically by `docker compose up -d` (see docker-compose.yml, which
-- mounts this file into MySQL's /docker-entrypoint-initdb.d/). To apply manually
-- against an existing MySQL 8+ server instead: select/create the `porterra-lite`
-- database, then run this whole file (phpMyAdmin: Import, or `mysql < db/schema.sql`).
--
-- See db/README.md for the full setup walkthrough.

CREATE DATABASE IF NOT EXISTS `porterra-lite` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `porterra-lite`;

-- ---------------------------------------------------------------------------
-- categories — lookup table for products.category_id / contacts.category_id
-- ---------------------------------------------------------------------------
-- COLLATE is explicit here (unlike the live dev DB's `categories` table, which
-- has none and so inherits the server's charset-default collation) because it
-- must match `contacts`/`products`.category_id's collation exactly for the FKs
-- below to succeed — a plain `DEFAULT CHARSET=utf8mb4` with no COLLATE is what
-- silently blocked those FKs from ever being added on the live dev DB.
CREATE TABLE IF NOT EXISTS `categories` (
  `id`         varchar(40)  COLLATE utf8mb4_unicode_ci NOT NULL,
  `name`       varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_custom`  tinyint(4)   NOT NULL DEFAULT '1',
  `created_at` bigint(20)   NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- contacts — the "leads" table (app layer calls these leads; the physical
-- MySQL table is `contacts` and was deliberately never renamed — see
-- src/lib/CLAUDE.md's `queries.js` section).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `contacts` (
  `id`                 varchar(40)  COLLATE utf8mb4_unicode_ci NOT NULL,
  `converted`          tinyint(1)   NOT NULL DEFAULT '0',
  `coordinator`        varchar(32)  COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company`            varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name`               varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone`              varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'concatenated multi-number lists; max observed 39 chars',
  `product`            text         COLLATE utf8mb4_unicode_ci COMMENT 'free-form product lists; max observed 539 chars',
  `category`           varchar(64)  COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'legacy free-text field, retained but no longer read/written by the app — see category_id',
  `category_id`        varchar(40)  COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source`             varchar(64)  COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date`               varchar(10)  COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'dd.mm.yyyy — canonical app format',
  `contact_date`       date GENERATED ALWAYS AS (str_to_date(nullif(`date`,''),'%d.%m.%Y')) STORED,
  `price`              varchar(64)  COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `result`             varchar(64)  COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `priority`           varchar(32)  COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes`              text         COLLATE utf8mb4_unicode_ci,
  `deactivate_reason`  varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quote_price`        varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quote_price_type`   varchar(50)  COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quote_terms`        text         COLLATE utf8mb4_unicode_ci,
  `quote_price_date`   varchar(10)  COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quote_result`       varchar(10)  COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quote_result_date`  varchar(10)  COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quote_fail_reason`  varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_contacts_company` (`company`),
  KEY `idx_contacts_coordinator` (`coordinator`),
  KEY `idx_contacts_category` (`category`),
  KEY `idx_contacts_source` (`source`),
  KEY `idx_contacts_contact_date` (`contact_date`),
  KEY `idx_contacts_coord_date` (`coordinator`,`contact_date`),
  KEY `idx_contacts_company_date` (`company`,`contact_date`),
  KEY `idx_contacts_result` (`result`),
  KEY `idx_contacts_quote_open` (`result`,`quote_result`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- customer_activity — comments + changelog entries, merged per-company feed
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `customer_activity` (
  `id`          varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type`        enum('comment','change') COLLATE utf8mb4_unicode_ci NOT NULL,
  `ts`          bigint(20) NOT NULL,
  `author`      varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `text`        text COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_activity_company` (`company_key`),
  KEY `idx_activity_ts` (`ts`),
  KEY `idx_activity_type_ts` (`type`,`ts`),
  KEY `idx_activity_company_ts` (`company_key`,`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
  `id`          varchar(40)  COLLATE utf8mb4_unicode_ci NOT NULL,
  `name`        varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category`    varchar(50)  COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'legacy free-text field, write-synced from category_id on every save — see src/lib/CLAUDE.md',
  `category_id` varchar(40)  COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_custom`   tinyint(1)   NOT NULL DEFAULT '1',
  `created_at`  bigint(20)   NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_products_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- reminders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reminders` (
  `id`         varchar(40)  COLLATE utf8mb4_unicode_ci NOT NULL,
  `cust_key`   varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company`    varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `due_date`   varchar(10)  COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'yyyy-mm-dd (from <input type=date>)',
  `due_time`   varchar(8)   COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `for_agent`  varchar(32)  COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `text`       text         COLLATE utf8mb4_unicode_ci,
  `created_at` bigint(20)   DEFAULT NULL,
  `done`       tinyint(1)   NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_reminders_done_due` (`done`,`due_date`),
  KEY `idx_reminders_cust` (`cust_key`),
  KEY `idx_reminders_foragent` (`for_agent`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`               varchar(40)  COLLATE utf8mb4_unicode_ci NOT NULL,
  `username`         varchar(64)  COLLATE utf8mb4_unicode_ci NOT NULL,
  `email`            varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_name`     varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `agent_code`       varchar(32)  COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department`       varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_cipher`  text         COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'AES-256-GCM, reversible — see src/lib/crypto.js',
  `role`             enum('admin','agent','manager','developer') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'agent',
  `active`           tinyint(1)   NOT NULL DEFAULT '1',
  `last_login`       bigint(20)   DEFAULT NULL,
  `created_at`       bigint(20)   NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_agent_code` (`agent_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Foreign keys — category_id references
--
-- NOTE: this is the intended design (see db/README.md's "Migration history"
-- section for the full story). At the time this file was generated, the FKs
-- had NOT actually been applied to the live dev database — `category_id`
-- columns were populated but unconstrained, blocked by a collation mismatch
-- on `categories` (see the comment above that table's CREATE TABLE, now
-- fixed in this file). Verified working against a scratch database before
-- being committed here.
-- ---------------------------------------------------------------------------
ALTER TABLE `products`
  ADD CONSTRAINT `fk_products_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`)
    ON DELETE RESTRICT;

ALTER TABLE `contacts`
  ADD CONSTRAINT `fk_contacts_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`)
    ON DELETE RESTRICT;

-- ---------------------------------------------------------------------------
-- Seed data — the 2 base categories every environment ships with.
-- Idempotent: safe to re-run.
-- ---------------------------------------------------------------------------
INSERT INTO `categories` (`id`, `name`, `is_custom`, `created_at`) VALUES
  ('CAT-chempoly', 'Chemical/Polymer', 0, UNIX_TIMESTAMP(NOW()) * 1000),
  ('CAT-solar',    'Solar',           0, UNIX_TIMESTAMP(NOW()) * 1000)
ON DUPLICATE KEY UPDATE `name` = `name`;

-- No seed contacts/products/users — create your first login with
-- `npm run db:create-user` (see db/README.md and the root README).
