const fs = require('fs');

// Load the data
const existingData = JSON.parse(fs.readFileSync('src/data/processed/points-with-multilingual-names.json', 'utf8'));
const pbfData = JSON.parse(fs.readFileSync('src/data/processed/pbf-points.json', 'utf8'));

console.log('🔍 Checking why only 3 out of 10 PBF points were merged...\n');

pbfData.points.forEach((pbfPoint, index) => {
  console.log(`\n${index + 1}. Checking: ${pbfPoint.name}`);
  console.log(`   Coordinates: ${pbfPoint.coordinates.latitude}, ${pbfPoint.coordinates.longitude}`);
  
  // Check for coordinate duplicates
  const coordinateMatch = existingData.find(point => 
    point.coordinates && 
    Math.abs(point.coordinates.latitude - pbfPoint.coordinates.latitude) < 0.001 &&
    Math.abs(point.coordinates.longitude - pbfPoint.coordinates.longitude) < 0.001
  );
  
  // Check for name duplicates
  const nameMatch = existingData.find(point => point.name === pbfPoint.name);
  
  if (coordinateMatch) {
    console.log(`   ❌ SKIPPED - Coordinate duplicate found: ${coordinateMatch.name} (ID: ${coordinateMatch.id})`);
  } else if (nameMatch) {
    console.log(`   ❌ SKIPPED - Name duplicate found: ${nameMatch.name} (ID: ${nameMatch.id})`);
  } else {
    console.log(`   ✅ WOULD BE ADDED - No duplicates found`);
  }
});

console.log('\n📊 Summary:');
console.log('The merge script skips points that have:');
console.log('1. Same coordinates (within 0.001 degrees)');
console.log('2. Same name (exact match)');
console.log('\nThis prevents duplicate points in your dataset.'); 