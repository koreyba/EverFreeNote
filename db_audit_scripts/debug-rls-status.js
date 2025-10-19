// Отладка статуса RLS политик EverFreeNote
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Отсутствуют переменные окружения')
  process.exit(1)
}

const client = createClient(supabaseUrl, supabaseKey)

async function debugRLSStatus() {
  console.log('🔍 ОТЛАДКА СТАТУСА RLS EverFreeNote')
  console.log('='.repeat(50))

  try {
    // 1. Прямой тест анонимного доступа
    console.log('\n1. 🛡️ ПРЯМОЙ ТЕСТ АНОНИМНОГО ДОСТУПА')
    const { data: directData, error: directError } = await client
      .from('notes')
      .select('*')

    if (directError) {
      console.log('✅ RLS работает - ошибка доступа:', directError.message)
      if (directError.message.includes('row-level security')) {
        console.log('🎉 ПОЛИТИКИ RLS АКТИВНЫ!')
        return
      }
    } else {
      console.log('❌ RLS НЕ РАБОТАЕТ - доступ разрешен')
      console.log('📊 Доступно записей:', directData?.length || 0)

      if (directData && directData.length > 0) {
        console.log('📋 Примеры данных:')
        directData.slice(0, 2).forEach((note, i) => {
          console.log(`   ${i + 1}. ID: ${note.id}`)
          console.log(`      User: ${note.user_id}`)
          console.log(`      Title: ${note.title}`)
        })
      }
    }

    // 2. Тест с попыткой аутентификации
    console.log('\n2. 👤 ТЕСТ С АУТЕНТИФИКАЦИЕЙ')

    // Имитация аутентифицированного пользователя
    const testUserId = 'ec926a90-88b8-4d91-8b68-9ed3f5cca522'

    console.log(`   Тестируем доступ для пользователя: ${testUserId}`)

    // Прямой запрос с user_id фильтром
    const { data: filteredData, error: filteredError } = await client
      .from('notes')
      .select('*')
      .eq('user_id', testUserId)

    if (filteredError) {
      console.log('❌ Ошибка фильтрации:', filteredError.message)
    } else {
      console.log(`✅ Доступно записей для пользователя: ${filteredData?.length || 0}`)
    }

    // 3. Тест создания новой записи
    console.log('\n3. ➕ ТЕСТ СОЗДАНИЯ ЗАПИСИ')

    const testNote = {
      id: 'test-' + Date.now(),
      user_id: testUserId,
      title: 'Тестовая заметка для проверки RLS',
      description: '<p>Это тест безопасности</p>',
      tags: ['test', 'security'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: insertData, error: insertError } = await client
      .from('notes')
      .insert(testNote)
      .select()

    if (insertError) {
      console.log('❌ Ошибка создания:', insertError.message)
      if (insertError.message.includes('row-level security')) {
        console.log('🛡️ RLS блокирует создание - политики работают!')
      }
    } else {
      console.log('✅ Запись создана успешно')
      console.log('📊 Создана запись:', insertData?.[0]?.id)

      // Попытка удалить тестовую запись
      console.log('\n4. 🗑️ ТЕСТ УДАЛЕНИЯ')
      const { error: deleteError } = await client
        .from('notes')
        .delete()
        .eq('id', testNote.id)

      if (deleteError) {
        console.log('❌ Ошибка удаления:', deleteError.message)
        if (deleteError.message.includes('row-level security')) {
          console.log('🛡️ RLS блокирует удаление - политики работают!')
        }
      } else {
        console.log('✅ Тестовая запись удалена')
      }
    }

    // 4. Проверка SQL политик (если возможно)
    console.log('\n5. 📋 СТАТУС ПОЛИТИК')

    console.log('💡 РЕКОМЕНДАЦИИ:')
    console.log('   1. Проверьте в Supabase Dashboard → Authentication → Policies')
    console.log('   2. Убедитесь что RLS включена для таблицы notes')
    console.log('   3. Проверьте что политики используют auth.uid()')
    console.log('   4. Попробуйте пересоздать политики')

    console.log('\n🔧 АЛЬТЕРНАТИВНЫЙ СКРИПТ В SQL EDITOR:')
    console.log(`
-- Полностью пересоздать RLS
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Удалить все политики
DROP POLICY IF EXISTS "Users can view own notes" ON notes;
DROP POLICY IF EXISTS "Users can insert own notes" ON notes;
DROP POLICY IF EXISTS "Users can update own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON notes;

-- Создать заново
CREATE POLICY "Users can view own notes" ON notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes" ON notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes" ON notes
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes" ON notes
  FOR DELETE USING (auth.uid() = user_id);
    `)

  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message)
  }

  console.log('\n' + '='.repeat(50))
}

debugRLSStatus().catch(console.error)
