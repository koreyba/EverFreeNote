/* global require, __dirname, console */
const fs = require('fs');
const path = require('path');

const target = path.resolve(__dirname, '../../core');
const link = path.resolve(__dirname, 'node_modules/@core');

try {
  if (!fs.existsSync(link)) {
    console.log('Creating junction for @core in node_modules...');
    fs.symlinkSync(target, link, 'junction');
    console.log('Junction created successfully.');
  } else {
    console.log('Junction for @core already exists.');
  }
} catch (error) {
  console.error('Failed to create junction for @core:', error);
}
