import PocketBase from 'pocketbase';

const PB_URL = process.env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';
const [,, EMAIL, PASSWORD] = process.argv;

if (!EMAIL || !PASSWORD) {
  console.error('Usage: npx tsx scripts/create-test-deals.ts <email> <password>');
  process.exit(1);
}

const pb = new PocketBase(PB_URL);

// List of random project names to create
const PROJECT_TEMPLATES = [
  { name: 'Kesäjuhlat 2026', hinta: 5000, deadline: '2026-06-15', status: 'Tarjous' },
  { name: 'Verkkosivu-uudistus', hinta: 3500, deadline: '2026-05-01', status: 'Uusi' },
  { name: 'DJ-keikka (yksityis)', hinta: 800, deadline: '2026-08-20', status: 'Voitettu' },
  { name: 'Some-markkinointi Q3', hinta: 1200, deadline: '2026-07-01', status: 'Neuvottelu' },
  { name: 'Pikkujoulut 2026', hinta: 10000, deadline: '2026-12-10', status: 'Yhteydenotto' },
];

async function main() {
  try {
    console.log(`Connecting to ${PB_URL}...`);
    await pb.admins.authWithPassword(EMAIL, PASSWORD);
    console.log('Logged in as admin.');

    // Fetch existing customers (limit 10)
    const customers = await pb.collection('asiakkaat').getList(1, 10);
    
    if (customers.items.length === 0) {
      console.error('No customers found! Please import CSV first.');
      process.exit(1);
    }

    console.log(`Found ${customers.items.length} customers.`);

    let createdCount = 0;
    
    // Assign random projects to random customers
    for (const template of PROJECT_TEMPLATES) {
      const randomCustomer = customers.items[Math.floor(Math.random() * customers.items.length)];
      
      const projectData = {
        ...template,
        asiakas: randomCustomer.id
      };

      try {
        const record = await pb.collection('projektit').create(projectData);
        console.log(`Created project: "${record.name}" for customer ${randomCustomer.name} (${record.status})`);
        createdCount++;
      } catch (err) {
        console.error(`Failed to create project "${template.name}":`, err.message);
      }
    }

    console.log(`\nDone! Created ${createdCount} test projects.`);
    
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
