// Cypress saves coverage after every spec. CI renders the complete union once,
// while collection, unvisited source files and default local reports stay intact.
module.exports = require('node:process').env.COMPONENT_COVERAGE_DEFER_REPORT === 'true'
  ? { reporter: [] }
  : {}
