const fs = require('fs');
const path = require('path');

const routes = [
  'items-publications.js',
  'search-browse.js',
  'orders-sales.js',
  'shipping.js',
  'questions-answers.js',
  'feedback-reviews.js',
  'categories-attributes.js'
];

const routesDir = path.join(__dirname, 'backend', 'routes');

routes.forEach(file => {
  const filepath = path.join(routesDir, file);
  let content = fs.readFileSync(filepath, 'utf8');
  
  // Fix various route patterns
  // For items-publications: /items/:id => /:id
  content = content.replace(/router\.get\('\/items\/'/g, "router.get('/");
  content = content.replace(/router\.put\('\/items\/'/g, "router.put('/");
  content = content.replace(/router\.delete\('\/items\/'/g, "router.delete('/");
  content = content.replace(/router\.post\('\/items\/'/g, "router.post('/");
  
  // For search-browse: /sites/:site_id/search => /:site_id/search, etc
  content = content.replace(/router\.get\('\/sites\/'/g, "router.get('/");
  content = content.replace(/router\.get\('\/categories\/'/g, "router.get('/");
  
  // For orders-sales
  content = content.replace(/router\.get\('\/orders\/'/g, "router.get('/");
  content = content.replace(/router\.put\('\/orders\/'/g, "router.put('/");
  content = content.replace(/router\.post\('\/packs'/g, "router.post('/packs");
  content = content.replace(/router\.get\('\/packs\/'/g, "router.get('/packs/");
  
  // For shipping
  content = content.replace(/router\.get\('\/shipments\/'/g, "router.get('/");
  content = content.replace(/router\.put\('\/shipments\/'/g, "router.put('/");
  content = content.replace(/router\.post\('\/shipments'/g, "router.post('/'");
  
  // For questions-answers
  content = content.replace(/router\.get\('\/items\/'/g, "router.get('/");
  content = content.replace(/router\.post\('\/questions'/g, "router.post('/questions");
  content = content.replace(/router\.put\('\/questions\/'/g, "router.put('/questions/");
  
  // For feedback-reviews
  content = content.replace(/router\.post\('\/feedback'/g, "router.post('/feedback");
  content = content.replace(/router\.get\('\/users\/'/g, "router.get('/users/");
  
  // For categories-attributes
  content = content.replace(/router\.post\('\/cache\/'/g, "router.post('/cache/");
  content = content.replace(/router\.get\('\/cache\/'/g, "router.get('/cache/");
  
  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`Fixed ${file}`);
});
