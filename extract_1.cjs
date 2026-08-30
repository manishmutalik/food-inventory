const fs = require('fs');
const path = require('path');

const appTsxPath = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

function extractBlock(startMarker, endMarker) {
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) return null;
  const endIndex = content.indexOf(endMarker, startIndex);
  if (endIndex === -1) return null;
  return content.slice(startIndex, endIndex);
}

// 1. Types
const typesContent = extractBlock('// ─── Type Definitions', '// ─── Seed / Initial Data');
if (typesContent) {
  fs.mkdirSync(path.join(__dirname, 'src', 'types'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'src', 'types', 'index.ts'), typesContent + '\n');
  console.log('Extracted types.');
}

// 2. Utils - Constants
const seedContent = extractBlock('// ─── Seed / Initial Data', '// ─── Seed Wastage Logs');
// Also extract CURRENCIES from Unit Conversion block
let constantsFile = `import { RawMaterial, MenuItem } from '../types';\n\n`;
if (seedContent) constantsFile += seedContent + '\n';
const currenciesMatch = content.match(/export const CURRENCIES = \[[\s\S]*?\];/);
if (currenciesMatch) constantsFile += currenciesMatch[0] + '\n';

fs.mkdirSync(path.join(__dirname, 'src', 'utils'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'src', 'utils', 'constants.ts'), constantsFile);
console.log('Extracted constants.');

// 3. Utils - Conversions
const conversionsContent = extractBlock('// ─── Unit Conversion Utilities', '// ─── Root Component');
if (conversionsContent) {
  // Remove CURRENCIES from conversions since it's in constants
  let cleanConversions = conversionsContent.replace(/export const CURRENCIES = \[[\s\S]*?\];/, '');
  fs.writeFileSync(path.join(__dirname, 'src', 'utils', 'conversions.ts'), cleanConversions + '\n');
  console.log('Extracted conversions.');
}

// 4. Utils - Error Handling
const errorContent1 = extractBlock('// ─── Error Handling', '// ─── Error Boundary');
const errorContent2 = extractBlock('// ─── Error Boundary', '// ─── Type Definitions');
if (errorContent1 && errorContent2) {
  const errorFile = `import React, { Component, ErrorInfo, ReactNode } from 'react';\n\n` + errorContent1 + '\n' + errorContent2;
  fs.writeFileSync(path.join(__dirname, 'src', 'utils', 'errorHandling.ts'), errorFile);
  console.log('Extracted error handling.');
}
