
-- Drop the old unique constraint that only uses (school_id, name)
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_school_id_name_key;

-- Add new unique constraint that includes grade and curriculum_id
-- This allows the same subject name in different grades
ALTER TABLE public.subjects ADD CONSTRAINT subjects_school_id_name_grade_curriculum_key UNIQUE(school_id, name, grade, curriculum_id);
