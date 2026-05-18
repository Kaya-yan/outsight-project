-- 0005_task_pool: make coder_a_id nullable for task pool + self-claim
-- Tasks with coder_a_id IS NULL are in the open pool, claimable by any coder.

ALTER TABLE coding_tasks ALTER COLUMN coder_a_id DROP NOT NULL;
