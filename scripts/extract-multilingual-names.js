const fs = require('fs');
const path = require('path');

/**
 * Script to extract multilingual names from point descriptions
 * and create enhanced data with multilingual names
 */

// Load existing data
const dataPath = path.join(__dirname, '..', 'src', 'data', 'processed', 'points-with-multilingual-names.json');
const outputPath = path.join(__dirname, '..', 'src', 'data', 'processed', 'points-with-multilingual-names.json');

console.log('Loading existing data...');
const points = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Common name translations based on the descriptions
const nameTranslations = {
  // Gates
  'שער האשפות': {
    en: 'Dung Gate',
    ru: 'Шаар а-Ашпот',
    he: 'שער האשפות'
  },
  
  // Mountains
  'הר חרמון': {
    en: 'Mount Hermon',
    ru: 'Гора Хермон',
    he: 'הר חרמון'
  },
  'הר שחרור': {
    en: 'Mount Shaharo',
    ru: 'Гора Шахарур',
    he: 'הר שחרור'
  },
  'הר שחרות': {
    en: 'Mount Shaharut',
    ru: 'Гора Шахарут',
    he: 'הר שחרות'
  },
  'הר שחמון': {
    en: 'Mount Shahmon',
    ru: 'Гора Шахмон',
    he: 'הר שחמון'
  },
  'הר עיתה': {
    en: 'Mount Ita',
    ru: 'Гора Ита',
    he: 'הר עיתה'
  },
  'הר פלך': {
    en: 'Mount Pelekh',
    ru: 'Гора Пелех',
    he: 'הר פלך'
  },
  'שן רמון': {
    en: 'Shen Ramon',
    ru: 'Шен Рамон',
    he: 'שן רמון'
  },
  
  // Cities and places
  'העיר העתיקה קיסריה': {
    en: 'Ancient Caesarea',
    ru: 'Древняя Кейсария',
    he: 'העיר העתיקה קיסריה'
  },
  'ירדנית': {
    en: 'Yardenit',
    ru: 'Ярденит',
    he: 'ירדנית'
  },
  
  // Cinema complexes
  'סינמה סיטי גלילות': {
    en: 'Cinema City Glilot',
    ru: 'Синема Сити Глилот',
    he: 'סינמה סיטי גלילות'
  },
  'סינמה פארק רעננה': {
    en: 'Cinema Park Ra\'anana',
    ru: 'Синема Парк Раанана',
    he: 'סינמה פארק רעננה'
  },
  
  // Forests and nature
  'שחריה': {
    en: 'Yaar HaMelachim-Shahariya',
    ru: 'Яар а-Малахим-Шахария',
    he: 'שחריה'
  },
  'גבעת אזוב': {
    en: 'Givat Ezov',
    ru: 'Гиват Эзов',
    he: 'גבעת אזוב'
  },
  'כתף בתרים': {
    en: 'Ketef Batarim',
    ru: 'Кетеф Батараим',
    he: 'כתף בתרים'
  },
  'תל שחרית': {
    en: 'Tel Shacharit',
    ru: 'Тель Шахарит',
    he: 'תל שחרית'
  },
  'שלוחת שחרות': {
    en: 'Shluchat Shaharut',
    ru: 'Шлюхат Шахарут',
    he: 'שלוחת שחרות'
  },
  'רכס קינן': {
    en: 'Kinan Ridge',
    ru: 'Хребет Кинан',
    he: 'רכס קינן'
  }
};

console.log('Processing points and adding multilingual names...');

const enhancedPoints = points.map(point => {
  const enhancedPoint = { ...point };
  
  // Check if we have a translation for this name
  if (nameTranslations[point.name]) {
    enhancedPoint.name = nameTranslations[point.name];
  }
  
  return enhancedPoint;
});

console.log('Saving enhanced data...');
fs.writeFileSync(outputPath, JSON.stringify(enhancedPoints, null, 2), 'utf8');

console.log(`✅ Enhanced data saved to: ${outputPath}`);
console.log(`📊 Processed ${enhancedPoints.length} points`);

// Count how many points got multilingual names
const multilingualCount = enhancedPoints.filter(point => 
  typeof point.name === 'object' && point.name.en && point.name.ru && point.name.he
).length;

console.log(`🌍 ${multilingualCount} points now have multilingual names`);
console.log(`📝 ${enhancedPoints.length - multilingualCount} points still use Hebrew names only`);

// Show some examples
console.log('\n🔍 Examples of multilingual names:');
enhancedPoints.slice(0, 5).forEach(point => {
  if (typeof point.name === 'object') {
    console.log(`- ${point.name.he} → EN: ${point.name.en}, RU: ${point.name.ru}`);
  } else {
    console.log(`- ${point.name} (Hebrew only)`);
  }
}); 