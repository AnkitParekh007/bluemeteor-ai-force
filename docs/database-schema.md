# Bluemeteor Supplier Portal — schema documentation (read-only)

> This file is **documentation only**. The Database Schema Reader does not connect to a live database or execute SQL.

## Table: `suppliers`

| Column | Type | Notes |
|--------|------|--------|
| id | uuid | PK |
| name | text | Display name |
| tenant_code | text | Unique per environment |
| status | text | active, suspended |
| created_at | timestamptz | |

## Table: `products`

| Column | Type | Notes |
|--------|------|--------|
| id | uuid | PK |
| supplier_id | uuid | FK → suppliers |
| sku | text | Unique per supplier |
| title | text | |
| syndicated_at | timestamptz | nullable |

## Table: `upload_jobs`

| Column | Type | Notes |
|--------|------|--------|
| id | uuid | PK |
| supplier_id | uuid | |
| status | text | queued, processing, completed, failed |
| file_name | text | |
| started_at | timestamptz | |
| completed_at | timestamptz | nullable |

## Table: `upload_errors`

| Column | Type | Notes |
|--------|------|--------|
| id | uuid | PK |
| upload_job_id | uuid | FK → upload_jobs |
| row_number | int | |
| message | text | Validation / parse error |
| created_at | timestamptz | |

## Table: `sku_status_history`

| Column | Type | Notes |
|--------|------|--------|
| id | uuid | PK |
| product_id | uuid | |
| old_status | text | |
| new_status | text | |
| changed_at | timestamptz | |

## Table: `syndication_jobs`

| Column | Type | Notes |
|--------|------|--------|
| id | uuid | PK |
| status | text | pending, running, success, error |
| depth | int | Queue metric snapshot |
| updated_at | timestamptz | |

## Table: `agent_sessions`

| Column | Type | Notes |
|--------|------|--------|
| id | text | PK |
| agent_slug | text | |
| mode | text | ask, plan, act |
| created_at | timestamptz | |

## Table: `agent_runs`

| Column | Type | Notes |
|--------|------|--------|
| id | text | PK |
| session_id | text | FK → agent_sessions |
| status | text | |
| user_message | text | |
| final_answer | text | nullable |
