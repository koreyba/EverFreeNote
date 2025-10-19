-- СТРОГИЕ ПОЛИТИКИ RLS EverFreeNote
-- Только аутентифицированные пользователи могут работать с данными

-- Полный сброс
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Удалить все политики
DROP POLICY IF EXISTS "Users can view own notes" ON notes;
DROP POLICY IF EXISTS "Users can insert own notes" ON notes;
DROP POLICY IF EXISTS "Users can update own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON notes;
DROP POLICY IF EXISTS "allow_select_own_notes" ON notes;
DROP POLICY IF EXISTS "allow_insert_own_notes" ON notes;
DROP POLICY IF EXISTS "allow_update_own_notes" ON notes;
DROP POLICY IF EXISTS "allow_delete_own_notes" ON notes;

-- Создать строгие политики - ТОЛЬКО АУТЕНТИФИЦИРОВАННЫЕ ПОЛЬЗОВАТЕЛИ
CREATE POLICY "authenticated_select_only" ON notes
  FOR SELECT USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "authenticated_insert_only" ON notes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "authenticated_update_only" ON notes
  FOR UPDATE USING (auth.role() = 'authenticated' AND auth.uid() = user_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "authenticated_delete_only" ON notes
  FOR DELETE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);
