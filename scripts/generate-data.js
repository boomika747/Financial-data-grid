import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NUM_RECORDS = 1000000;
const OUTPUT_FILE = path.join(__dirname, '../public/transactions.json');

const merchants = ['TechCorp', 'Globex', 'Soylent', 'Initech', 'Umbrella', 'Stark Industries', 'Wayne Enterprises', 'Massive Dynamic', 'Cyberdyne', 'Hooli', 'Pied Piper'];
const categories = ['Software', 'Hardware', 'Services', 'Consulting', 'Advertising', 'Logistics', 'R&D', 'Operations', 'Payroll', 'Legal'];
const statuses = ['Completed', 'Pending', 'Failed'];

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateRecord(id) {
    const date = new Date(Date.now() - getRandomInt(0, 31536000000)); // random date within last year
    return {
        id,
        date: date.toISOString(),
        merchant: getRandomItem(merchants),
        category: getRandomItem(categories),
        amount: parseFloat((Math.random() * 10000).toFixed(2)),
        status: getRandomItem(statuses),
        description: `Transaction ${id} for ${getRandomItem(categories)}`
    };
}

async function generateData() {
    console.log(`Generating ${NUM_RECORDS} records...`);

    // Ensure public directory exists
    const publicDir = path.join(__dirname, '../public');
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }

    const stream = fs.createWriteStream(OUTPUT_FILE);
    stream.write('[\n');

    for (let i = 0; i < NUM_RECORDS; i++) {
        const record = generateRecord(i + 1);
        const isLast = i === NUM_RECORDS - 1;
        const chunk = JSON.stringify(record) + (isLast ? '' : ',\n');

        // Write to stream, handle backpressure
        if (!stream.write(chunk)) {
            await new Promise(resolve => stream.once('drain', resolve));
        }

        if (i > 0 && i % 100000 === 0) {
            console.log(`Generated ${i} records...`);
        }
    }

    stream.write('\n]');
    stream.end();

    stream.on('finish', () => {
        console.log(`Data successfully generated at ${OUTPUT_FILE}`);
    });
}

generateData().catch(console.error);
