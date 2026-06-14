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
