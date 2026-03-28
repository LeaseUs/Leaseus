ALTER TABLE IF EXISTS provider_kyc
  ADD COLUMN IF NOT EXISTS dbs_update_service_id TEXT;

ALTER TABLE IF EXISTS provider_kyc
  ADD COLUMN IF NOT EXISTS dbs_update_service_registered BOOLEAN DEFAULT false;

ALTER TABLE IF EXISTS provider_kyc
  ADD COLUMN IF NOT EXISTS right_to_work_code TEXT;

NOTIFY pgrst, 'reload schema';
