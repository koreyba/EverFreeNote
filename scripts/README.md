# Performance Testing Scripts

Scripts for testing and measuring application performance with large datasets.

## Scripts

### 1. Generate Test Notes

Generates realistic test notes for performance testing.

```bash
# Generate 1000 notes (default)
npm run perf:generate

# Generate custom amount
npm run perf:generate 5000

# Generate for specific user
npm run perf:generate 1000 [userId]
```

**Features:**
- Generates realistic note titles and descriptions
- Random tags (1-4 per note)
- Random dates within past year
- Inserts in batches of 100 for reliability
- Progress tracking

**Note:** You must be authenticated (logged in) to generate notes.

**Authentication:**
1. Start the dev server: `npm run dev`
2. Open http://localhost:3000 and login
3. Keep the browser open (maintains session)
4. Run the script in a separate terminal

---

### 2. Measure Performance

Measures query performance and verifies optimization targets.

```bash
npm run perf:measure
```

**Tests:**
- Paginated queries (50, 100 notes)
- Tag filtering
- Search queries
- Single note retrieval
- Count queries

**Performance Targets:**
- Paginated Query: < 500ms
- Tag Filter: < 500ms
- Search Query: < 500ms
- Single Note: < 300ms

**Output:**
- Query execution times
- Success/failure status
- Comparison with targets
- Average performance metrics

---

## Workflow

### Initial Setup

1. **Start local Supabase:**
   ```bash
   npm run db:start
   ```

2. **Verify database status:**
   ```bash
   npm run db:status
   ```

### Performance Testing

1. **Generate test data:**
   ```bash
   # Start with 1000 notes
   npm run perf:generate 1000
   
   # Then try 5000 for stress testing
   npm run perf:generate 5000
   ```

2. **Measure performance:**
   ```bash
   npm run perf:measure
   ```

3. **Test in browser:**
   - Open http://localhost:3000
   - Login
   - Observe loading times
   - Test scrolling performance
   - Check browser DevTools Performance tab

### Cleanup

To remove test data:
```bash
# Reset database (WARNING: deletes all data)
npm run db:reset
```

---

## Performance Benchmarks

### Expected Results (with indexes)

| Metric | Target | Typical |
|--------|--------|---------|
| First 50 notes | < 500ms | ~100-200ms |
| Tag filter | < 500ms | ~100-200ms |
| Search (ilike) | < 500ms | ~200-400ms |
| Single note | < 300ms | ~50-100ms |
| Count query | < 500ms | ~50-150ms |

### With 1,000 notes:
- Initial load: < 1s
- Scroll: 60 FPS
- Note open: < 300ms
- Note save: < 100ms (perceived)

### With 10,000 notes:
- Initial load: < 2s
- Scroll: 60 FPS (virtual scrolling)
- Note open: < 300ms
- Note save: < 100ms (perceived)

---

## Troubleshooting

### "Not authenticated" error
- Make sure you're logged in to the app first
- Or provide userId as second argument

### Slow performance
- Check if indexes are created: `npm run db:status`
- Verify migration applied: Check `supabase/migrations/`
- Run `npm run db:reset` to reapply migrations

### Out of memory
- Reduce batch size in generate-test-notes.js
- Generate in smaller chunks

---

## Notes

- Scripts use `.env.local` for Supabase credentials
- Test data is realistic but randomly generated
- Performance varies based on:
  - Network latency
  - Database load
  - Local machine specs
  - Browser performance

