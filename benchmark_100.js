const https = require('http');
const fs = require('fs');

const topics = [
    // 1. Consumer Tech & Mobile
    { id: 1, cat: 'Consumer Tech', query: "my mobile is not starting/rebooting" },
    { id: 2, cat: 'Consumer Tech', query: "iphone screen is black but vibrating" },
    { id: 3, cat: 'Consumer Tech', query: "samsung galaxy won't connect to wifi" },
    { id: 4, cat: 'Consumer Tech', query: "my wired type c is not connecting to my mobile" },
    { id: 5, cat: 'Consumer Tech', query: "airpods keep disconnecting from my macbook" },
    { id: 6, cat: 'Consumer Tech', query: "phone battery draining 50% in one hour" },
    { id: 7, cat: 'Consumer Tech', query: "ipad touch screen not responding to finger" },
    { id: 8, cat: 'Consumer Tech', query: "dropped phone in water, speaker sounds muffled" },
    { id: 9, cat: 'Consumer Tech', query: "google pixel camera app keeps crashing" },
    { id: 10, cat: 'Consumer Tech', query: "bluetooth car audio keeps cutting out" },

    // 2. Computers & Operating Systems
    { id: 11, cat: 'Computers & OS', query: "my laptop is not charging" },
    { id: 12, cat: 'Computers & OS', query: "windows 11 blue screen error critical process died" },
    { id: 13, cat: 'Computers & OS', query: "macbook fan running loud and laptop overheating" },
    { id: 14, cat: 'Computers & OS', query: "laptop keyboard spacebar and enter key stopped working" },
    { id: 15, cat: 'Computers & OS', query: "pc won't turn on no lights on motherboard" },
    { id: 16, cat: 'Computers & OS', query: "outlook stuck on loading profile screen" },
    { id: 17, cat: 'Computers & OS', query: "forgot my windows login pin and password reset isn't working" },
    { id: 18, cat: 'Computers & OS', query: "external hard drive not showing up in file explorer" },
    { id: 19, cat: 'Computers & OS', query: "hp printer says paper jam but there is no paper inside" },
    { id: 20, cat: 'Computers & OS', query: "computer running extremely slow after latest update" },

    // 3. Automotive & Mechanics
    { id: 21, cat: 'Automotive', query: "car clicks rapidly when turning key but engine won't crank" },
    { id: 22, cat: 'Automotive', query: "check engine light on and car shaking at red light" },
    { id: 23, cat: 'Automotive', query: "brakes making a high pitched squeal when slowing down" },
    { id: 24, cat: 'Automotive', query: "car AC blowing warm air on driver side" },
    { id: 25, cat: 'Automotive', query: "transmission slipping when shifting from 2nd to 3rd gear" },
    { id: 26, cat: 'Automotive', query: "smoke coming from under hood with sweet maple syrup smell" },
    { id: 27, cat: 'Automotive', query: "steering wheel vibrating heavily at highway speeds" },
    { id: 28, cat: 'Automotive', query: "car battery dies overnight every 2 days" },
    { id: 29, cat: 'Automotive', query: "oil pressure warning light came on while driving" },
    { id: 30, cat: 'Automotive', query: "key fob won't unlock doors even after replacing battery" },

    // 4. Veterinary & Pets
    { id: 31, cat: 'Veterinary', query: "my dog has a fever and is lethargic" },
    { id: 32, cat: 'Veterinary', query: "cat hasn't eaten in two days and is hiding in closet" },
    { id: 33, cat: 'Veterinary', query: "puppy swallowed a small sock about an hour ago" },
    { id: 34, cat: 'Veterinary', query: "dog constantly scratching ears and shaking head" },
    { id: 35, cat: 'Veterinary', query: "dog limping on back right leg after playing fetch" },
    { id: 36, cat: 'Veterinary', query: "cat having difficulty urinating and crying in litter box" },
    { id: 37, cat: 'Veterinary', query: "dog ate a chocolate chip cookie off the counter" },
    { id: 38, cat: 'Veterinary', query: "older dog suddenly having accidents inside the house" },
    { id: 39, cat: 'Veterinary', query: "kitten has runny eyes and sneezing repeatedly" },
    { id: 40, cat: 'Veterinary', query: "dog has a soft lump on chest that seems new" },

    // 5. Appliances
    { id: 41, cat: 'Appliances', query: "refrigerator freezer is cold but fridge section is warm" },
    { id: 42, cat: 'Appliances', query: "washing machine leaking water from the bottom during spin" },
    { id: 43, cat: 'Appliances', query: "dryer spinning but clothes come out completely damp and cold" },
    { id: 44, cat: 'Appliances', query: "dishwasher not draining water standing in bottom of tub" },
    { id: 45, cat: 'Appliances', query: "electric oven not reaching set temperature" },
    { id: 46, cat: 'Appliances', query: "microwave runs and timer counts down but food doesn't heat" },
    { id: 47, cat: 'Appliances', query: "garbage disposal humming loudly but blades won't turn" },
    { id: 48, cat: 'Appliances', query: "ice maker stopped making ice cubes suddenly" },
    { id: 49, cat: 'Appliances', query: "washing machine displaying error code LE during rinse" },
    { id: 50, cat: 'Appliances', query: "gas stove burner clicking constantly even when knob is off" },

    // 6. Plumbing & HVAC
    { id: 51, cat: 'Plumbing & HVAC', query: "water heater leaking rusty water around the base" },
    { id: 52, cat: 'Plumbing & HVAC', query: "toilet tank filling continuously every 5 minutes" },
    { id: 53, cat: 'Plumbing & HVAC', query: "kitchen sink draining very slowly and gurgling" },
    { id: 54, cat: 'Plumbing & HVAC', query: "low water pressure in shower only upstairs" },
    { id: 55, cat: 'Plumbing & HVAC', query: "furnace blowing cold air when thermostat is set to 72" },
    { id: 56, cat: 'Plumbing & HVAC', query: "air conditioner outdoor unit buzzing but fan is not spinning" },
    { id: 57, cat: 'Plumbing & HVAC', query: "sewage smell coming from basement bathroom drain" },
    { id: 58, cat: 'Plumbing & HVAC', query: "pipe under bathroom sink dripping at slip joint" },
    { id: 59, cat: 'Plumbing & HVAC', query: "tankless water heater showing error code 11" },
    { id: 60, cat: 'Plumbing & HVAC', query: "radiator clanking loudly when heat turns on" },

    // 7. Legal
    { id: 61, cat: 'Legal', query: "landlord threatening eviction without 30 days notice" },
    { id: 62, cat: 'Legal', query: "employer refusing to pay final paycheck after resignation" },
    { id: 63, cat: 'Legal', query: "received a civil summons for old credit card debt" },
    { id: 64, cat: 'Legal', query: "how to contest a speeding ticket received in another state" },
    { id: 65, cat: 'Legal', query: "neighbor's dead tree fell on my fence who is liable" },
    { id: 66, cat: 'Legal', query: "contractor took deposit and vanished without starting work" },
    { id: 67, cat: 'Legal', query: "ex-spouse stopped paying court ordered child support" },
    { id: 68, cat: 'Legal', query: "someone used my photos on their commercial website copyright" },
    { id: 69, cat: 'Legal', query: "signing a non-compete clause in new job offer letter" },
    { id: 70, cat: 'Legal', query: "how to file a claim in small claims court for $3500" },

    // 8. Finance & Taxes
    { id: 71, cat: 'Finance & Taxes', query: "received IRS notice CP2000 showing unreported income" },
    { id: 72, cat: 'Finance & Taxes', query: "1099 form has incorrect gross income reported by client" },
    { id: 73, cat: 'Finance & Taxes', query: "how to calculate crypto capital gains on staking rewards" },
    { id: 74, cat: 'Finance & Taxes', query: "late filing penalty relief for small business LLC" },
    { id: 75, cat: 'Finance & Taxes', query: "deducting home office expenses when working hybrid" },
    { id: 76, cat: 'Finance & Taxes', query: "back taxes owed from 2022 what are settlement options" },
    { id: 77, cat: 'Finance & Taxes', query: "inherited traditional IRA withdrawal tax implications" },
    { id: 78, cat: 'Finance & Taxes', query: "unauthorized wire transfer from business checking account" },
    { id: 79, cat: 'Finance & Taxes', query: "how to file an amended tax return for missed child tax credit" },
    { id: 80, cat: 'Finance & Taxes', query: "S-Corp reasonable salary guidelines for single owner" },

    // 9. Accounts & Subscriptions
    { id: 81, cat: 'Accounts & Billing', query: "my email account was hacked and passwords were changed" },
    { id: 82, cat: 'Accounts & Billing', query: "unauthorized recurring charge on credit card from unknown merchant" },
    { id: 83, cat: 'Accounts & Billing', query: "locked out of apple ID two factor authentication trusted number changed" },
    { id: 84, cat: 'Accounts & Billing', query: "facebook account disabled falsely for community standards" },
    { id: 85, cat: 'Accounts & Billing', query: "netflix charging twice every month for same account" },
    { id: 86, cat: 'Accounts & Billing', query: "amazon order marked delivered but package never arrived" },
    { id: 87, cat: 'Accounts & Billing', query: "google account recovery loop asking for verification sent to same email" },
    { id: 88, cat: 'Accounts & Billing', query: "how to cancel automatic renewal subscription when button is missing" },
    { id: 89, cat: 'Accounts & Billing', query: "someone opened a utility account under my social security number" },
    { id: 90, cat: 'Accounts & Billing', query: "paypal funds placed on 180 day hold without explanation" },

    // 10. Medical & Health
    { id: 91, cat: 'Medical & Health', query: "pain in lower right abdomen sharp when pressing down" },
    { id: 92, cat: 'Medical & Health', query: "sprained ankle swollen and bruised can put slight weight" },
    { id: 93, cat: 'Medical & Health', query: "sudden rash with itchy red bumps after starting new medication" },
    { id: 94, cat: 'Medical & Health', query: "high fever 102 in 4 year old child responsive but lethargic" },
    { id: 95, cat: 'Medical & Health', query: "severe migraine with visual aura and nausea for 6 hours" },
    { id: 96, cat: 'Medical & Health', query: "tick bite with red ring bullseye appearance on forearm" },
    { id: 97, cat: 'Medical & Health', query: "pain when swallowing on one side of throat only" },
    { id: 98, cat: 'Medical & Health', query: "dizziness and room spinning when turning head in bed" },
    { id: 99, cat: 'Medical & Health', query: "burn on hand from boiling water blister formed" },
    { id: 100, cat: 'Medical & Health', query: "shortness of breath when walking up one flight of stairs" }
];

function sendChat(message, history = []) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({ message, history });
        const req = https.request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/chat',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function runBenchmark() {
    console.log(`Starting benchmark for ${topics.length} topics across 10 categories...`);
    const results = [];
    const startTime = Date.now();

    // Sample across each category (e.g. 2 per category for quick initial pass, or all 100 in batches of 5)
    for (let i = 0; i < topics.length; i += 5) {
        const batch = topics.slice(i, i + 5);
        const batchPromises = batch.map(async (t) => {
            const t0 = Date.now();
            try {
                // Turn 1
                const res1 = await sendChat(t.query, []);
                const data1 = res1.data || {};
                const reply1 = data1.reply_text || '';
                const emDash1 = /[\u2014\u2013\u2212\uFE58]|&mdash;|&ndash;|--/.test(reply1);

                return {
                    id: t.id,
                    vertical: t.cat,
                    query: t.query,
                    category: data1.category,
                    expertRole: data1.expert_role,
                    recommendation1: data1.recommendation,
                    replyText1: reply1,
                    emDashFound: emDash1,
                    durationMs: Date.now() - t0,
                    status: 'OK'
                };
            } catch (err) {
                return {
                    id: t.id,
                    vertical: t.cat,
                    query: t.query,
                    error: err.message,
                    status: 'ERROR'
                };
            }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        console.log(`Processed ${results.length}/${topics.length} topics...`);
    }

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Completed ${results.length} topics in ${totalDuration}s`);

    fs.writeFileSync('benchmark_results_100.json', JSON.stringify(results, null, 2));
    console.log('Saved benchmark_results_100.json');
}

runBenchmark();
