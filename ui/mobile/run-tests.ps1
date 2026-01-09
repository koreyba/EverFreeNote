# Run all tests and save output
npm test 2>&1 | Tee-Object -FilePath "test-results.txt"

# Show summary
Get-Content "test-results.txt" | Select-String -Pattern "Test Suites:|Tests:" | Select-Object -Last 2
