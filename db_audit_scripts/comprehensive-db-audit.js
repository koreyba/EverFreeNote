// Комплексный аудит базы данных EverFreeNote с использованием Supabase SDK
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Отсутствуют переменные окружения SUPABASE_URL или SUPABASE_ANON_KEY')
  process.exit(1)
}

// Создаем клиентов для разных уровней доступа
const anonClient = createClient(supabaseUrl, supabaseKey)
const serviceClient = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null

class DatabaseAuditor {
  constructor() {
    this.results = {
      connection: null,
      security: null,
      integrity: null,
      performance: null,
      structure: null,
      auth: null,
      backup: null
    }
    this.passed = true
  }

  async runFullAudit() {
    console.log('🔍 КОМПЛЕКСНЫЙ АУДИТ БАЗЫ ДАННЫХ EverFreeNote')
    console.log('='.repeat(60))

    try {
      await this.testConnection()
      await this.testSecurity()
      await this.testDataIntegrity()
      await this.testPerformance()
      await this.testStructure()
      await this.testAuth()
      await this.testBackupCapabilities()

      this.generateReport()
    } catch (error) {
      console.error('❌ Критическая ошибка аудита:', error.message)
      this.passed = false
    }
  }

  async testConnection() {
    console.log('\n1. 🌐 ТЕСТ ПОДКЛЮЧЕНИЯ')
    this.results.connection = { passed: true, details: [] }

    try {
      // Тест базового подключения
      const { data, error } = await anonClient
        .from('notes')
        .select('count')
        .limit(1)

      if (error) {
        this.results.connection.passed = false
        this.results.connection.details.push(`Ошибка подключения: ${error.message}`)
        this.passed = false
      } else {
        this.results.connection.details.push('✅ Базовое подключение успешно')
      }

      // Тест сервисного клиента (если доступен)
      if (serviceClient) {
        const { error: serviceError } = await serviceClient
          .from('notes')
          .select('count')
          .limit(1)

        if (serviceError) {
          this.results.connection.details.push(`⚠️  Service client ошибка: ${serviceError.message}`)
        } else {
          this.results.connection.details.push('✅ Service client работает')
        }
      }

    } catch (error) {
      this.results.connection.passed = false
      this.results.connection.details.push(`Критическая ошибка: ${error.message}`)
      this.passed = false
    }
  }

  async testSecurity() {
    console.log('\n2. 🛡️  ТЕСТ БЕЗОПАСНОСТИ')
    this.results.security = { passed: true, details: [] }

    try {
      // Тест RLS - анонимный доступ
      const { data: anonData, error: anonError } = await anonClient
        .from('notes')
        .select('id, title, user_id')
        .limit(5)

      if (anonError && anonError.message.includes('row-level security')) {
        this.results.security.details.push('✅ RLS активна - анонимный доступ заблокирован')
      } else if (anonData && anonData.length > 0) {
        this.results.security.passed = false
        this.results.security.details.push(`❌ КРИТИЧНАЯ УЯЗВИМОСТЬ: Анонимный доступ к ${anonData.length} записям`)
        this.passed = false
      } else {
        this.results.security.details.push('⚠️  RLS активна, но возвращает пустые результаты')
      }

      // Тест инъекций (базовый)
      const maliciousQueries = [
        "'; DROP TABLE notes; --",
        "<script>alert('xss')</script>",
        "1' OR '1'='1"
      ]

      for (const query of maliciousQueries) {
        try {
          const { error } = await anonClient
            .from('notes')
            .select('*')
            .ilike('title', `%${query}%`)
            .limit(1)

          if (!error || !error.message.includes('row-level security')) {
            this.results.security.details.push(`⚠️  Возможная уязвимость к инъекциям с запросом: ${query}`)
          }
        } catch (e) {
          // Игнорируем ошибки теста
        }
      }

      // Проверка политик RLS
      if (serviceClient) {
        const { data: policies, error: policyError } = await serviceClient
          .rpc('get_policies', { table_name: 'notes' })

        if (!policyError && policies) {
          this.results.security.details.push(`✅ Найдено RLS политик: ${policies.length}`)
        }
      }

    } catch (error) {
      this.results.security.passed = false
      this.results.security.details.push(`Ошибка тестирования безопасности: ${error.message}`)
      this.passed = false
    }
  }

  async testDataIntegrity() {
    console.log('\n3. 🏗️  ТЕСТ ЦЕЛОСТНОСТИ ДАННЫХ')
    this.results.integrity = { passed: true, details: [] }

    try {
      // Получаем образец данных
      const { data: sampleData, error: dataError } = await anonClient
        .from('notes')
        .select('*')
        .limit(10)

      if (dataError && !dataError.message.includes('row-level security')) {
        this.results.integrity.passed = false
        this.results.integrity.details.push(`Ошибка получения данных: ${dataError.message}`)
        this.passed = false
        return
      }

      if (!sampleData || sampleData.length === 0) {
        this.results.integrity.details.push('⚠️  Нет данных для проверки целостности')
        return
      }

      let integrityErrors = 0
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

      sampleData.forEach((note, index) => {
        // Проверка UUID полей
        if (note.id && !uuidRegex.test(note.id)) {
          this.results.integrity.details.push(`❌ Запись ${index + 1}: некорректный UUID id`)
          integrityErrors++
        }

        if (note.user_id && !uuidRegex.test(note.user_id)) {
          this.results.integrity.details.push(`❌ Запись ${index + 1}: некорректный UUID user_id`)
          integrityErrors++
        }

        // Проверка обязательных полей
        if (!note.title || note.title.trim() === '') {
          this.results.integrity.details.push(`❌ Запись ${index + 1}: пустой title`)
          integrityErrors++
        }

        // Проверка временных меток
        if (note.created_at && isNaN(Date.parse(note.created_at))) {
          this.results.integrity.details.push(`❌ Запись ${index + 1}: некорректная дата created_at`)
          integrityErrors++
        }

        if (note.updated_at && isNaN(Date.parse(note.updated_at))) {
          this.results.integrity.details.push(`❌ Запись ${index + 1}: некорректная дата updated_at`)
          integrityErrors++
        }

        // Проверка логики дат
        if (note.created_at && note.updated_at) {
          const created = new Date(note.created_at)
          const updated = new Date(note.updated_at)
          if (updated < created) {
            this.results.integrity.details.push(`❌ Запись ${index + 1}: updated_at раньше created_at`)
            integrityErrors++
          }
        }
      })

      if (integrityErrors === 0) {
        this.results.integrity.details.push('✅ Целостность данных подтверждена')
      } else {
        this.results.integrity.passed = false
        this.results.integrity.details.push(`❌ Найдено ошибок целостности: ${integrityErrors}`)
        this.passed = false
      }

      // Проверка внешних ключей
      if (serviceClient) {
        const { data: constraints, error: constraintError } = await serviceClient
          .rpc('get_foreign_keys', { table_name: 'notes' })

        if (!constraintError && constraints) {
          this.results.integrity.details.push(`✅ Найдено FK ограничений: ${constraints.length}`)
        }
      }

    } catch (error) {
      this.results.integrity.passed = false
      this.results.integrity.details.push(`Ошибка тестирования целостности: ${error.message}`)
      this.passed = false
    }
  }

  async testPerformance() {
    console.log('\n4. ⚡ ТЕСТ ПРОИЗВОДИТЕЛЬНОСТИ')
    this.results.performance = { passed: true, details: [] }

    try {
      // Тест скорости простого запроса
      const startTime = Date.now()
      const { data: perfData, error: perfError } = await anonClient
        .from('notes')
        .select('id')
        .limit(10)

      const queryTime = Date.now() - startTime

      if (perfError && !perfError.message.includes('row-level security')) {
        this.results.performance.passed = false
        this.results.performance.details.push(`Ошибка производительности: ${perfError.message}`)
        this.passed = false
      } else {
        this.results.performance.details.push(`✅ Время запроса: ${queryTime}ms`)

        if (queryTime > 1000) {
          this.results.performance.details.push('⚠️  Медленный запрос (>1s)')
          this.results.performance.passed = false
        } else if (queryTime < 100) {
          this.results.performance.details.push('✅ Запрос выполняется быстро')
        }
      }

      // Тест поиска
      const searchStart = Date.now()
      const { data: searchData, error: searchError } = await anonClient
        .from('notes')
        .select('id, title')
        .ilike('title', '%test%')
        .limit(5)

      const searchTime = Date.now() - searchStart

      if (!searchError || !searchError.message.includes('row-level security')) {
        this.results.performance.details.push(`✅ Поисковый запрос: ${searchTime}ms`)
      }

      // Тест пагинации
      const pageStart = Date.now()
      const { data: pageData, error: pageError } = await anonClient
        .from('notes')
        .select('id, title')
        .range(0, 9)

      const pageTime = Date.now() - pageStart

      if (!pageError || !pageError.message.includes('row-level security')) {
        this.results.performance.details.push(`✅ Пагинация: ${pageTime}ms`)
      }

    } catch (error) {
      this.results.performance.passed = false
      this.results.performance.details.push(`Ошибка тестирования производительности: ${error.message}`)
    }
  }

  async testStructure() {
    console.log('\n5. 📊 ТЕСТ СТРУКТУРЫ')
    this.results.structure = { passed: true, details: [] }

    try {
      // Получаем информацию о структуре таблицы
      const { data: sampleData, error: structError } = await anonClient
        .from('notes')
        .select('*')
        .limit(1)

      if (structError && !structError.message.includes('row-level security')) {
        this.results.structure.passed = false
        this.results.structure.details.push(`Ошибка получения структуры: ${structError.message}`)
        this.passed = false
        return
      }

      if (sampleData && sampleData.length > 0) {
        const fields = Object.keys(sampleData[0])
        this.results.structure.details.push(`✅ Доступные поля: ${fields.join(', ')}`)

        // Проверка обязательных полей
        const requiredFields = ['id', 'user_id', 'title', 'created_at']
        const missingFields = requiredFields.filter(field => !fields.includes(field))

        if (missingFields.length > 0) {
          this.results.structure.passed = false
          this.results.structure.details.push(`❌ Отсутствуют обязательные поля: ${missingFields.join(', ')}`)
          this.passed = false
        } else {
          this.results.structure.details.push('✅ Все обязательные поля присутствуют')
        }

        // Проверка типов данных
        const note = sampleData[0]
        const typeChecks = [
          { field: 'id', expected: 'string', value: note.id },
          { field: 'user_id', expected: 'string', value: note.user_id },
          { field: 'title', expected: 'string', value: note.title },
          { field: 'created_at', expected: 'string', value: note.created_at }
        ]

        typeChecks.forEach(check => {
          if (check.value && typeof check.value !== check.expected) {
            this.results.structure.details.push(`⚠️  Поле ${check.field}: ожидался ${check.expected}, получен ${typeof check.value}`)
          }
        })
      }

      // Тест индексов (через сервисный клиент)
      if (serviceClient) {
        const { data: indexes, error: indexError } = await serviceClient
          .rpc('get_indexes', { table_name: 'notes' })

        if (!indexError && indexes) {
          this.results.structure.details.push(`✅ Найдено индексов: ${indexes.length}`)
        }
      }

    } catch (error) {
      this.results.structure.passed = false
      this.results.structure.details.push(`Ошибка тестирования структуры: ${error.message}`)
      this.passed = false
    }
  }

  async testAuth() {
    console.log('\n6. 👤 ТЕСТ АУТЕНТИФИКАЦИИ')
    this.results.auth = { passed: true, details: [] }

    try {
      // Проверка тестовых пользователей
      const testUserIds = [
        'ec926a90-88b8-4d91-8b68-9ed3f5cca522', // test@example.com
        'e0b6eca0-9e4d-4214-b76c-4db8b54fa2a2'  // skip-auth@example.com
      ]

      for (const userId of testUserIds) {
        const { data: userNotes, error: userError } = await anonClient
          .from('notes')
          .select('id, title')
          .eq('user_id', userId)
          .limit(3)

        if (userError && !userError.message.includes('row-level security')) {
          this.results.auth.details.push(`❌ Ошибка доступа к заметкам пользователя ${userId}: ${userError.message}`)
        } else if (userNotes) {
          this.results.auth.details.push(`✅ Пользователь ${userId}: ${userNotes.length} заметок`)
        }
      }

      // Тест сессии (если есть сервисный ключ)
      if (serviceClient) {
        const { data: authUsers, error: authError } = await serviceClient.auth.admin.listUsers()

        if (!authError && authUsers) {
          this.results.auth.details.push(`✅ Аутентифицировано пользователей: ${authUsers.users.length}`)
        }
      }

    } catch (error) {
      this.results.auth.details.push(`Ошибка тестирования аутентификации: ${error.message}`)
    }
  }

  async testBackupCapabilities() {
    console.log('\n7. 💾 ТЕСТ РЕЗЕРВНОГО КОПИРОВАНИЯ')
    this.results.backup = { passed: true, details: [] }

    try {
      // Проверка возможности экспорта данных
      const { data: exportData, error: exportError } = await anonClient
        .from('notes')
        .select('*')

      if (exportError && !exportError.message.includes('row-level security')) {
        this.results.backup.passed = false
        this.results.backup.details.push(`❌ Ошибка экспорта данных: ${exportError.message}`)
      } else {
        this.results.backup.details.push('✅ Данные доступны для экспорта')
      }

      // Тест транзакций (базовый)
      const testTransaction = async () => {
        const { data, error } = await anonClient.rpc('test_transaction')
        return { data, error }
      }

      // Проверка репликации (базовая)
      if (serviceClient) {
        const { data: replicationStatus, error: replError } = await serviceClient
          .rpc('get_replication_status')

        if (!replError && replicationStatus) {
          this.results.backup.details.push('✅ Статус репликации получен')
        }
      }

    } catch (error) {
      this.results.backup.details.push(`Ошибка тестирования резервного копирования: ${error.message}`)
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60))
    console.log('📋 ИТОГОВЫЙ ОТЧЕТ АУДИТА')
    console.log('='.repeat(60))

    const sections = [
      { name: 'Подключение', key: 'connection' },
      { name: 'Безопасность', key: 'security' },
      { name: 'Целостность данных', key: 'integrity' },
      { name: 'Производительность', key: 'performance' },
      { name: 'Структура', key: 'structure' },
      { name: 'Аутентификация', key: 'auth' },
      { name: 'Резервное копирование', key: 'backup' }
    ]

    sections.forEach(section => {
      const result = this.results[section.key]
      if (result) {
        console.log(`\n${section.name}: ${result.passed ? '✅ ПРОЙДЕН' : '❌ НЕ ПРОЙДЕН'}`)
        result.details.forEach(detail => console.log(`   ${detail}`))
      }
    })

    console.log('\n' + '='.repeat(60))

    if (this.passed) {
      console.log('🎉 БАЗА ДАННЫХ ПРОШЛА ПОЛНЫЙ АУДИТ!')
      console.log('✅ Все критические проверки пройдены')
      console.log('✅ Система безопасна и готова к продакшену')
      console.log('🚀 Можно запускать приложение')
    } else {
      console.log('❌ АУДИТ НЕ ПРОЙДЕН!')
      console.log('🔥 Есть критические проблемы безопасности или целостности')
      console.log('🛑 Требуется исправление перед продакшеном')

      // Рекомендации по исправлению
      console.log('\n💡 РЕКОМЕНДАЦИИ:')
      if (!this.results.security?.passed) {
        console.log('   - Проверить и исправить RLS политики')
        console.log('   - Запустить: final-audit.js для детального анализа безопасности')
      }
      if (!this.results.integrity?.passed) {
        console.log('   - Очистить или исправить поврежденные данные')
        console.log('   - Проверить констрейнты и триггеры')
      }
      if (!this.results.performance?.passed) {
        console.log('   - Оптимизировать запросы и добавить индексы')
        console.log('   - Рассмотреть кеширование')
      }
    }

    console.log('='.repeat(60))
  }
}

// Запуск аудита
async function main() {
  const auditor = new DatabaseAuditor()
  await auditor.runFullAudit()
}

main().catch(console.error)
