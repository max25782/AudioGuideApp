const fs = require('fs');
const path = require('path');

// Note: You'll need to install these packages:
// npm install osm-pbf-parser through2

/**
 * Extract points from PBF file and convert to AudioGuideApp format
 * 
 * Usage:
 * node scripts/extract-points-from-pbf.js <input-pbf-file> <output-json-file>
 * 
 * Example:
 * node scripts/extract-points-from-pbf.js israel-latest.osm.pbf src/data/processed/pbf-points.json
 */

async function extractPointsFromPbf(inputFile, outputFile) {
  try {
    console.log(`Extracting points from: ${inputFile}`);
    console.log(`Output will be saved to: ${outputFile}`);

    // Check if input file exists
    if (!fs.existsSync(inputFile)) {
      throw new Error(`Input file not found: ${inputFile}`);
    }

    // Import required modules (you'll need to install these)
    let PbfParser, through2;
    
    try {
      PbfParser = require('osm-pbf-parser');
      through2 = require('through2');
    } catch (error) {
      console.error('Required packages not found. Please install:');
      console.error('npm install osm-pbf-parser through2');
      process.exit(1);
    }

    const points = [];
    const categories = new Set();
    let processedCount = 0;

    // Create parser stream
    const parser = new PbfParser();
    
    // Process the PBF file
    const stream = fs.createReadStream(inputFile)
      .pipe(parser)
      .pipe(through2.obj((item, enc, next) => {
        processedCount++;
        
        if (processedCount % 1000 === 0) {
          console.log(`Processed ${processedCount} items...`);
        }

        // Only process nodes with coordinates and relevant tags
        if (item.type === 'node' && item.lat && item.lon && item.tags) {
          const extractedPoint = convertToExtractedPoint(item);
          if (extractedPoint) {
            points.push(extractedPoint);
            categories.add(extractedPoint.category);
          }
        }

        next();
      }));

    // Wait for stream to finish
    await new Promise((resolve, reject) => {
      stream.on('end', () => {
        console.log(`\nProcessing completed!`);
        console.log(`Total items processed: ${processedCount}`);
        console.log(`Points extracted: ${points.length}`);
        console.log(`Categories found: ${Array.from(categories).join(', ')}`);
        resolve();
      });

      stream.on('error', (error) => {
        console.error('Stream error:', error);
        reject(error);
      });
    });

    // Save to JSON file
    const outputData = {
      metadata: {
        source: inputFile,
        extractedAt: new Date().toISOString(),
        totalPoints: points.length,
        categories: Array.from(categories),
        processedItems: processedCount
      },
      points: points
    };

    // Ensure output directory exists
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
    console.log(`\n✅ Points saved to: ${outputFile}`);

    // Print statistics
    printStatistics(points, categories);

  } catch (error) {
    console.error('Error extracting points:', error);
    process.exit(1);
  }
}

/**
 * Convert OSM item to AudioGuideApp point format
 */
function convertToExtractedPoint(osmItem) {
  const tags = osmItem.tags || {};
  
  // Determine category based on tags
  const category = determineCategory(tags);
  
  // Skip points without meaningful categories
  if (!category || category === 'unknown') {
    return null;
  }

  // Generate name (prefer Hebrew, then English, then Russian)
  const name = tags['name:he'] || tags['name:en'] || tags['name:ru'] || tags.name || `Point ${osmItem.id}`;
  
  // Generate description
  const description = generateDescription(osmItem);

  return {
    id: `pbf_${osmItem.id}`,
    name: name,
    category: category,
    coordinates: {
      latitude: osmItem.lat,
      longitude: osmItem.lon
    },
    description: description,
    tags: tags,
    osmType: osmItem.type,
    osmId: osmItem.id
  };
}

/**
 * Determine category based on OSM tags
 */
function determineCategory(tags) {
  // Historical sites
  if (tags.historic || tags.heritage || tags.castle || tags.fort || tags.archaeological_site) {
    return 'historical';
  }

  // Religious sites
  if (tags.religion || tags.place_of_worship || tags.synagogue || tags.mosque || tags.church || tags.temple) {
    return 'religious';
  }

  // Nature and parks
  if (tags.natural || tags.park || tags.forest || tags.beach || tags.mountain || tags.viewpoint) {
    return 'nature';
  }

  // Tourism and attractions
  if (tags.tourism || tags.attraction || tags.museum || tags.gallery || tags.artwork) {
    return 'tourism';
  }

  // Culture and entertainment
  if (tags.leisure || tags.cinema || tags.theatre || tags.library || tags.concert_hall) {
    return 'culture';
  }

  // Children and family
  if (tags.playground || tags.kindergarten || tags.school || tags.entertainment) {
    return 'children';
  }

  // Architecture
  if (tags.building || tags.architecture || tags.monument || tags.memorial) {
    return 'architecture';
  }

  // Amenities
  if (tags.amenity || tags.shop || tags.restaurant || tags.cafe || tags.bar) {
    return 'amenity';
  }

  return 'unknown';
}

/**
 * Generate description based on OSM tags
 */
function generateDescription(osmItem) {
  const tags = osmItem.tags || {};
  const descriptions = [];

  // Add names in different languages
  if (tags['name:he']) descriptions.push(`שם: ${tags['name:he']}`);
  if (tags['name:en']) descriptions.push(`Name: ${tags['name:en']}`);
  if (tags['name:ru']) descriptions.push(`Название: ${tags['name:ru']}`);

  // Add type information
  if (tags.historic) descriptions.push(`היסטורי: ${tags.historic}`);
  if (tags.religion) descriptions.push(`דת: ${tags.religion}`);
  if (tags.tourism) descriptions.push(`תיירות: ${tags.tourism}`);
  if (tags.natural) descriptions.push(`טבע: ${tags.natural}`);
  if (tags.amenity) descriptions.push(`שירות: ${tags.amenity}`);

  // Add additional details
  if (tags.description) descriptions.push(tags.description);
  if (tags['description:he']) descriptions.push(tags['description:he']);
  if (tags['description:en']) descriptions.push(tags['description:en']);
  if (tags['description:ru']) descriptions.push(tags['description:ru']);

  // Add website if available
  if (tags.website) descriptions.push(`אתר: ${tags.website}`);

  return descriptions.join('. ') || 'תיאור לא זמין';
}

/**
 * Print statistics about extracted points
 */
function printStatistics(points, categories) {
  console.log('\n📊 Statistics:');
  console.log('==============');
  
  // Category breakdown
  const categoryCounts = {};
  points.forEach(point => {
    categoryCounts[point.category] = (categoryCounts[point.category] || 0) + 1;
  });

  console.log('\nCategories:');
  Object.entries(categoryCounts)
    .sort(([,a], [,b]) => b - a)
    .forEach(([category, count]) => {
      console.log(`  ${category}: ${count} points`);
    });

  // Language breakdown
  const languageCounts = { he: 0, en: 0, ru: 0 };
  points.forEach(point => {
    if (point.tags['name:he']) languageCounts.he++;
    if (point.tags['name:en']) languageCounts.en++;
    if (point.tags['name:ru']) languageCounts.ru++;
  });

  console.log('\nLanguages:');
  console.log(`  Hebrew names: ${languageCounts.he}`);
  console.log(`  English names: ${languageCounts.en}`);
  console.log(`  Russian names: ${languageCounts.ru}`);

  // Sample points
  console.log('\nSample points:');
  points.slice(0, 5).forEach((point, index) => {
    console.log(`  ${index + 1}. ${point.name} (${point.category})`);
  });
}

/**
 * Main execution
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node scripts/extract-points-from-pbf.js <input-pbf-file> <output-json-file>');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/extract-points-from-pbf.js israel-latest.osm.pbf src/data/processed/pbf-points.json');
    console.log('  node scripts/extract-points-from-pbf.js tel-aviv.osm.pbf src/data/processed/tel-aviv-points.json');
    console.log('');
    console.log('You can download PBF files from:');
    console.log('  - https://download.geofabrik.de/ (country/region extracts)');
    console.log('  - https://extract.bbbike.org/ (custom area extracts)');
    process.exit(1);
  }

  const [inputFile, outputFile] = args;
  extractPointsFromPbf(inputFile, outputFile);
}

module.exports = { extractPointsFromPbf, convertToExtractedPoint, determineCategory }; 