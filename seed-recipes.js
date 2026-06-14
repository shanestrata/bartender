require('dotenv').config();
const { Pool } = require('pg');

const ssl = process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl });

const recipes = [
  {
    name: 'Hillcrisp Martini',
    method: 'shaken',
    glass: 'Nick & Nora',
    base_serves: 1,
    garnishes: JSON.stringify(['Lemon peel']),
    notes: 'Chill Nick & Nora glass. Shake with ice and double strain. Top with Sauvy B and stir in gently. Express lemon peel over the glass and garnish.',
    ingredients: JSON.stringify([
      { id: 1, name: 'Gin',                    amt: '1.5', ingUnit: 'oz' },
      { id: 2, name: 'Elderflower (St. Germain)', amt: '1',   ingUnit: 'oz' },
      { id: 3, name: 'Lemon juice',            amt: '0.5', ingUnit: 'oz' },
      { id: 4, name: 'Sauvignon Blanc',        amt: '1',   ingUnit: 'oz' },
    ]),
  },
  {
    name: 'Belmont Jewel',
    method: 'built',
    glass: 'Rocks',
    base_serves: 1,
    garnishes: JSON.stringify(['Lemon wedge', 'Orange twist']),
    notes: 'Build over ice in a rocks glass. Add bourbon, then pomegranate juice, then lemonade. Stir gently to combine.',
    ingredients: JSON.stringify([
      { id: 1, name: 'Bourbon',          amt: '1.5', ingUnit: 'oz' },
      { id: 2, name: 'Lemonade',         amt: '2',   ingUnit: 'oz' },
      { id: 3, name: 'Pomegranate juice', amt: '1',  ingUnit: 'oz' },
    ]),
  },
  {
    name: 'White Carnation',
    method: 'shaken',
    glass: 'Collins',
    base_serves: 1,
    garnishes: JSON.stringify(['Mint sprig', 'Orange twist']),
    notes: 'Combine all ingredients except soda water in a shaker with ice and shake for 10 seconds. Strain back into the shaker and dry-shake (no ice) for 10 more seconds. Double strain into a chilled Collins glass. Let sit 30 seconds, then slowly pour soda water over the top.',
    ingredients: JSON.stringify([
      { id: 1, name: 'Vodka',                          amt: '2',    ingUnit: 'oz' },
      { id: 2, name: 'Peach liqueur (Mathilde Pêche)', amt: '0.75', ingUnit: 'oz' },
      { id: 3, name: 'Lemon juice',                    amt: '1',    ingUnit: 'oz' },
      { id: 4, name: 'Orange juice, freshly squeezed', amt: '1',    ingUnit: 'oz' },
      { id: 5, name: 'Heavy whipping cream',           amt: '1',    ingUnit: 'oz' },
      { id: 6, name: 'Egg white',                      amt: '1',    ingUnit: 'oz' },
      { id: 7, name: 'Soda water',                     amt: '1',    ingUnit: 'oz' },
    ]),
  },
];

(async () => {
  for (const r of recipes) {
    await pool.query(
      `INSERT INTO recipes (name, method, glass, base_serves, garnishes, notes, ingredients)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT DO NOTHING`,
      [r.name, r.method, r.glass, r.base_serves, r.garnishes, r.notes, r.ingredients]
    );
    console.log('Inserted:', r.name);
  }
  await pool.end();
  console.log('Done.');
})();
