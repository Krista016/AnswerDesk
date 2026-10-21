/**
 * AnswerDesk - Knowledge Base, Popular Issues & Comprehensive FAQ
 * Real-time instant search, category filtering, zero-results fallback bridge, and interactive modal reader.
 */

(function () {
    'use strict';

    // ===== 16 Comprehensive Real-World Troubleshooting Guides =====
    const kbArticles = [
        {
            id: 'windows-11-printer-offline',
            category: 'tech',
            categoryLabel: 'Windows & PC',
            tagClass: 'tech',
            title: 'How to Fix Windows 11 Printer Offline Error (0x0000011b & Spooler Reset)',
            readTime: '5 min read',
            difficulty: 'Beginner',
            author: {
                name: 'David Miller',
                role: 'Senior Windows Systems Engineer',
                avatar: 'assets/expert-1.png'
            },
            snippet: 'Printer connected via USB or WiFi displays "Offline" or "Driver Unavailable" despite being powered on and ready.',
            previewSteps: [
                'Restart the Windows Print Spooler service via Services console',
                'Clear corrupted print queue cache in %SystemRoot%\\System32\\spool\\printers',
                'Configure SNMP Status and Port TCP/IP settings'
            ],
            symptoms: 'Documents get stuck in queue with "Error - Printing", printer status shows "Offline" in Windows Settings, error code 0x0000011b appears during network printing.',
            cause: 'Corrupted print spooler buffer, Windows 11 RPC authentication security patches (KB5005565), or stale TCP/IP port SNMP queries failing to receive printer acknowledgment.',
            steps: [
                {
                    title: 'Restart Windows Print Spooler Service',
                    content: 'Press Win + R, type <code>services.msc</code>, and hit Enter. Scroll down to <strong>Print Spooler</strong>. Right-click it and select <strong>Restart</strong>. Alternatively, launch Command Prompt as Administrator and run the command below:',
                    command: 'net stop spooler && net start spooler'
                },
                {
                    title: 'Purge Corrupted Print Spooler Queue Cache',
                    content: 'Open File Explorer and navigate to <code>C:\\Windows\\System32\\spool\\PRINTERS</code>. Delete all pending files inside this folder (.SHD and .SPL files). Ensure the spooler service is stopped while deleting.',
                    command: 'del /Q /F /S "%systemroot%\\System32\\Spool\\Printers\\*.*"'
                },
                {
                    title: 'Disable SNMP Status Monitoring on Printer Port',
                    content: 'Go to <strong>Settings &gt; Bluetooth &amp; Devices &gt; Printers &amp; Scanners</strong>. Click your printer &gt; <strong>Printer Properties</strong> &gt; <strong>Ports</strong> tab. Select your IP port, click <strong>Configure Port</strong>, and uncheck <strong>SNMP Status Enabled</strong>.'
                }
            ],
            warning: 'If your printer is connected to a shared office server, registry adjustments under HKEY_LOCAL_MACHINE\\System\\CurrentControlSet\\Control\\Print (RpcAuthnLevelPrivacyEnabled = 0) may be required. Consult an IT specialist before modifying server registries.',
            proTip: 'Assigning a static DHCP IP reservation on your router permanently prevents network printers from dropping offline after router reboots.',
            supportPrompt: 'My printer is showing offline error 0x0000011b on Windows 11 and won\'t print.'
        },
        {
            id: 'windows-bsod-critical-process',
            category: 'tech',
            categoryLabel: 'Windows & PC',
            tagClass: 'tech',
            title: 'Resolving Blue Screen (BSOD) "CRITICAL_PROCESS_DIED" & "DPC_WATCHDOG_VIOLATION"',
            readTime: '7 min read',
            difficulty: 'Intermediate',
            author: {
                name: 'David Miller',
                role: 'Senior Windows Systems Engineer',
                avatar: 'assets/expert-1.png'
            },
            snippet: 'Windows abruptly crashes with a blue screen, stop code CRITICAL_PROCESS_DIED, and restarts or freezes at dump creation.',
            previewSteps: [
                'Boot into Windows Recovery Environment (WinRE)',
                'Run System File Checker (SFC) and DISM Health Restoration',
                'Perform clean boot to isolate faulty kernel drivers'
            ],
            symptoms: 'PC freezes abruptly for 2-3 seconds, cuts to BSOD with stop code 0x000000EF or 0x00000133, and fails to reboot into desktop.',
            cause: 'A critical background subsystem (such as csrss.exe, wininit.exe, or svchost.exe) terminated unexpectedly due to corrupt system files, incompatible SSD firmware, or SATA AHCI controller conflicts.',
            steps: [
                {
                    title: 'Execute SFC & DISM System File Repairs',
                    content: 'Open Command Prompt as Administrator (or boot into WinRE Advanced Options &gt; Command Prompt) and run:',
                    command: 'DISM.exe /Online /Cleanup-image /Restorehealth && sfc /scannow'
                },
                {
                    title: 'Update or Roll Back SATA AHCI Controller Driver',
                    content: 'Press Win + X &gt; Device Manager. Expand <strong>IDE ATA/ATAPI controllers</strong>. Right-click the controller &gt; Update driver &gt; "Browse my computer for drivers" &gt; select the generic <strong>Standard SATA AHCI Controller</strong>.'
                },
                {
                    title: 'Run Windows Memory Diagnostic & Disk Integrity Check',
                    content: 'Check for physical SSD/HDD sector damage and RAM faults by scheduling a full disk check on next reboot:',
                    command: 'chkdsk C: /f /r'
                }
            ],
            warning: 'If the BSOD occurs immediately during POST boot before reaching the login screen, avoid force resetting multiple times to prevent BCD master boot record corruption.',
            proTip: 'Examine C:\\Windows\\Minidump using WinDbg to pinpoint the exact third-party .sys driver (e.g. nvlddmkm.sys, storahci.sys) causing the crash.',
            supportPrompt: 'My Windows PC is crashing with Blue Screen CRITICAL_PROCESS_DIED and DPC_WATCHDOG_VIOLATION.'
        },
        {
            id: 'macbook-apple-logo-freeze',
            category: 'apple',
            categoryLabel: 'Apple & Mac',
            tagClass: 'apple',
            title: 'MacBook Stuck on Apple Logo with Progress Bar or Spinning Gear: Safe Recovery',
            readTime: '6 min read',
            difficulty: 'Intermediate',
            author: {
                name: 'James Wilson',
                role: 'Apple & iOS Specialist',
                avatar: 'assets/expert-2.png'
            },
            snippet: 'MacBook powers on, chimes, displays the Apple logo with progress bar at 100%, but never reaches the login screen.',
            previewSteps: [
                'Perform SMC & NVRAM / PRAM parameter resets',
                'Boot into Safe Mode to bypass corrupt launch agents',
                'Run Disk Utility First Aid on APFS volume container'
            ],
            symptoms: 'MacBook screen stays on Apple logo indefinitely, bar hangs at 100% or loops rebooting every 2 minutes.',
            cause: 'Corrupt APFS file system catalog, incompatible third-party kernel extensions, or depleted SSD storage preventing creation of swap files.',
            steps: [
                {
                    title: 'Reset NVRAM / PRAM (Intel Macs) or Power Cycle (Apple Silicon M1/M2/M3)',
                    content: 'On Intel: Shut down, power on, and immediately hold <strong>Option + Command + P + R</strong> for 20 seconds. On Apple Silicon: Press and hold the power button until "Loading startup options" appears.'
                },
                {
                    title: 'Boot into Safe Mode',
                    content: 'For Intel: Turn on Mac and immediately hold <strong>Shift</strong> until the login window appears. For Apple Silicon: In Startup Options, select your startup disk, hold <strong>Shift</strong>, and click "Continue in Safe Mode".'
                },
                {
                    title: 'Run Disk Utility First Aid in macOS Recovery',
                    content: 'Boot into Recovery (hold Cmd + R on Intel, or choose Options on Apple Silicon). Open <strong>Disk Utility</strong> &gt; View &gt; Show All Devices. Select "Macintosh HD - Data" and click <strong>First Aid</strong>.'
                }
            ],
            warning: 'Do NOT erase the disk in Disk Utility unless you have a verified Time Machine backup. Your user data is intact in the Data volume.',
            proTip: 'If your disk was completely full before the crash, Safe Mode can purge system temp caches and give you enough headroom to boot and free up space.',
            supportPrompt: 'My MacBook is stuck on the Apple logo with a frozen progress bar and won\'t load macOS.'
        },
        {
            id: 'iphone-recovery-mode-bootloop',
            category: 'apple',
            categoryLabel: 'Apple & Mac',
            tagClass: 'apple',
            title: 'iPhone Stuck on Apple Logo Loop or Recovery Mode (support.apple.com/restore)',
            readTime: '5 min read',
            difficulty: 'Beginner',
            author: {
                name: 'James Wilson',
                role: 'Apple & iOS Specialist',
                avatar: 'assets/expert-2.png'
            },
            snippet: 'iPhone continuously flashes the Apple logo every 10 seconds or shows a computer cable pointing to a screen.',
            previewSteps: [
                'Force restart using hardware button key combination',
                'Perform an iOS "Update" through Finder/iTunes without erasing data',
                'Inspect Lightning/USB-C charging port for foreign debris'
            ],
            symptoms: 'Device keeps cycling Apple logo on and off, or shows the black screen with "support.apple.com/restore".',
            cause: 'Failed iOS update (iOS 17/18), critically low internal flash storage (100% full), or corrupted springboard filesystem.',
            steps: [
                {
                    title: 'Perform Hardware Force Restart Sequence',
                    content: 'Quickly press and release <strong>Volume Up</strong>, quickly press and release <strong>Volume Down</strong>, then press and hold the <strong>Side Power Button</strong> for 15-20 seconds until the Apple logo reappears.'
                },
                {
                    title: 'Connect to Mac (Finder) or Windows (Apple Devices / iTunes)',
                    content: 'Plug iPhone into computer via certified cable. When computer detects device in Recovery Mode, choose <strong>"Update"</strong> (DO NOT select "Restore"). This reinstalls iOS while preserving photos and apps.'
                },
                {
                    title: 'Enter DFU Mode as Final Recovery Option',
                    content: 'If standard update fails with Error 4013 or 9, DFU mode completely re-flashes the baseband and bootloader firmware.'
                }
            ],
            warning: 'Selecting "Restore" wipes all device content. Always attempt "Update" first to preserve personal data.',
            proTip: 'A common culprit is an iPhone with 0 MB storage remaining. Reinstalling via Finder frees temporary space to allow successful boot.',
            supportPrompt: 'My iPhone is stuck in a boot loop showing the Apple logo over and over.'
        },
        {
            id: 'samsung-fridge-freezer-cold-fridge-warm',
            category: 'appliances',
            categoryLabel: 'Home Appliances',
            tagClass: 'appliances',
            title: 'Samsung / LG Refrigerator: Freezer Freezing but Fresh Food Section Warm',
            readTime: '6 min read',
            difficulty: 'Intermediate',
            author: {
                name: 'Michael Torres',
                role: 'Master Appliance Technician',
                avatar: 'assets/expert-3.png'
            },
            snippet: 'Ice cream and meat in the freezer are solid cold (0°F), but the upper refrigerator section is 55°F+ and spoiling food.',
            previewSteps: [
                'Inspect evaporator fan motor behind back panel for frost lock',
                'Test defrost thermistor and heating element continuity',
                'Check damper door assembly between compartments'
            ],
            symptoms: 'Freezer works perfectly, upper fridge section stays warm, humming sound from back panel or rattling fan noise.',
            cause: 'Defrost drain freeze-up blocking airflow, ice buildup stopping the evaporator fan blade, or a stuck motorized damper door preventing chilled air from ascending.',
            steps: [
                {
                    title: 'Check Air Vent Louvers & Evaporator Fan Operation',
                    content: 'Open the fresh food door and press the door switch. You should feel cold air blowing from the top rear vents and hear the fan whirring. If silent or grinding, the fan blade is iced over.'
                },
                {
                    title: 'Force Manual Defrost Mode',
                    content: 'On Samsung models, press and hold <strong>Energy Saver + Fridge</strong> buttons simultaneously for 8 seconds until the display beeps and flashes. Press Fridge until "Fd" (Forced Defrost) appears to melt internal coil ice.'
                },
                {
                    title: 'Inspect & Clear Frozen Drain Tube',
                    content: 'Unplug fridge, remove lower rear interior panel. If the drain pan underneath coils is a block of ice, use warm water and a turkey baster to clear the drain hole and install a drain tube clip extension.'
                }
            ],
            warning: 'Always unplug the appliance before removing electrical panels or handling defrost heating elements, which can reach over 400°F.',
            proTip: 'Installing an extended copper defrost clip (Samsung part #DA61-06796A) transfers heater warmth into the drain trough and permanently prevents recurring ice clogs.',
            supportPrompt: 'My refrigerator freezer is cold but the fresh food section is warm (55 degrees).'
        },
        {
            id: 'washer-not-draining-error-oe',
            category: 'appliances',
            categoryLabel: 'Home Appliances',
            tagClass: 'appliances',
            title: 'Washing Machine Not Draining or Spinning (Error Codes OE, F9E1, 5d, SUD)',
            readTime: '5 min read',
            difficulty: 'Beginner',
            author: {
                name: 'Michael Torres',
                role: 'Master Appliance Technician',
                avatar: 'assets/expert-3.png'
            },
            snippet: 'Washer stops mid-cycle with tub full of soapy water; drain pump hums or clicks but water will not empty.',
            previewSteps: [
                'Drain tub manually and inspect front debris trap / coin filter',
                'Check drain pump impeller for trapped hairpins or coins',
                'Inspect drain hose for kinks or vacuum siphoning'
            ],
            symptoms: 'Water remaining in drum after cycle finishes, OE/F9E1 error code flashing, clothes soaking wet.',
            cause: 'Debris filter clogged with coins or lint, drain pump impeller jammed by foreign object, or standing drain pipe siphoning back into washer.',
            steps: [
                {
                    title: 'Access Front Coin Filter / Clean-out Trap',
                    content: 'Open the small access hatch at the bottom front of the machine. Place shallow pans and towels. Pull out the small black rubber hose to drain water, then unscrew the large circular filter counter-clockwise.'
                },
                {
                    title: 'Clear Debris and Verify Impeller Rotation',
                    content: 'Remove all lint, coins, and hair. Reach inside the cavity with a flashlight and flick the plastic pump impeller. It should turn with a slight magnetic click/resistance, not spin loosely or jam.'
                },
                {
                    title: 'Verify Standpipe Height & Siphon Break',
                    content: 'Ensure the rear drain hose is not pushed more than 4-6 inches down the wall standpipe. Sealing it with tape causes negative pressure suction that traps water.'
                }
            ],
            warning: 'Water inside the tub may be scalding hot if a hot wash cycle just completed. Allow water to cool before opening the drain plug.',
            proTip: 'If the pump hums but does not turn even when clear of debris, the magnetic coil has overheated and the pump motor assembly needs replacement.',
            supportPrompt: 'My washing machine is full of water and won\'t drain, showing error code OE / F9E1.'
        },
        {
            id: 'check-engine-light-p0420',
            category: 'auto',
            categoryLabel: 'Automotive',
            tagClass: 'auto',
            title: 'Check Engine Light Code P0420: Catalytic Converter Diagnosis & Sensor Testing',
            readTime: '7 min read',
            difficulty: 'Advanced',
            author: {
                name: 'Robert Chen',
                role: 'Master Automotive Technician (ASE)',
                avatar: 'assets/expert-4.png'
            },
            snippet: 'Diagnostic Trouble Code P0420: "Catalytic Converter System Efficiency Below Threshold (Bank 1)".',
            previewSteps: [
                'Read live O2 sensor voltage data with OBD-II scanner',
                'Inspect exhaust manifold for upstream cracks and pinhole leaks',
                'Check for engine misfire or coolant/oil consumption'
            ],
            symptoms: 'Check Engine Light illuminated on dash, subtle loss of high-RPM power, slight sulfur/rotten egg smell from exhaust.',
            cause: 'Exhaust leak upstream of downstream O2 sensor, lazy downstream oxygen sensor reporting erratic switching, or fouled catalytic converter honeycombs.',
            steps: [
                {
                    title: 'Inspect Live OBD-II O2 Sensor Graphs',
                    content: 'Connect an OBD-II live data scanner. Upstream O2 (Sensor 1) should switch rapidly between 0.1V and 0.9V. Downstream O2 (Sensor 2) on a healthy cat should stay steady around 0.45V - 0.7V. If Sensor 2 mirrors Sensor 1, efficiency is degraded.'
                },
                {
                    title: 'Check for Pre-Cat Exhaust & Flex Pipe Leaks',
                    content: 'With the engine cold, use a shop vac on reverse (blower mode) into the tailpipe while spraying soapy water along the exhaust manifold and flanges. Bubbles identify leaks introducing false oxygen.'
                },
                {
                    title: 'Fix Underlying Misfires Before Replacing Converter',
                    content: 'Never replace a catalytic converter without checking fuel trims (STFT/LTFT) and spark plugs. Rich fuel mixtures or unburnt gas destroy new converters within 500 miles.'
                }
            ],
            warning: 'Never clear the P0420 code right before a state emissions inspection. Drive cycles require 50-100 miles to set readiness monitors, and the code will return if unresolved.',
            proTip: 'In over 35% of P0420 cases, a corroded exhaust flange gasket or failing downstream O2 sensor triggers the code rather than a bad converter.',
            supportPrompt: 'My check engine light is on with code P0420 Catalytic Converter Efficiency Below Threshold.'
        },
        {
            id: 'car-wont-start-clicking-vs-dead',
            category: 'auto',
            categoryLabel: 'Automotive',
            tagClass: 'auto',
            title: 'Car Won\'t Start: Rapid Clicking vs Dead Silence (Starter, Battery & Alternator)',
            readTime: '6 min read',
            difficulty: 'Beginner',
            author: {
                name: 'Robert Chen',
                role: 'Master Automotive Technician (ASE)',
                avatar: 'assets/expert-4.png'
            },
            snippet: 'Turning the key or pressing start results in rapid clicking, a single loud clunk, or complete electrical silence.',
            previewSteps: [
                'Test battery resting voltage with digital multimeter',
                'Clean lead-acid terminal corrosion with baking soda mix',
                'Perform starter relay and solenoid tap test'
            ],
            symptoms: 'Engine does not crank, dash lights flicker rapidly during start attempt, or headlights dim to near black.',
            cause: 'Depleted battery (<11.8V), oxidized terminal clamps creating high resistance, or worn starter solenoid contacts unable to bridge motor current.',
            steps: [
                {
                    title: 'Differentiate the 3 Distinct Starting Sounds',
                    content: '<strong>Rapid Machine-Gun Clicking:</strong> Battery has enough juice to pull starter solenoid, but voltage collapses under load. <strong>Single Loud Click/Clunk:</strong> Starter solenoid engaged but starter motor is seized. <strong>Dead Silence:</strong> Immobilizer, neutral safety switch, or dead battery.'
                },
                {
                    title: 'Measure Battery Voltage Under Load',
                    content: 'A healthy battery rests at 12.6V. Below 12.0V is 75% discharged. If voltage drops below 9.6V while turning the key, the battery has failed internally.'
                },
                {
                    title: 'Perform Clean Jump Start Protocol',
                    content: 'Connect Red (+) to dead battery positive, Red (+) to donor positive. Connect Black (-) to donor negative, and final Black (-) to unpainted bare engine metal on dead vehicle.'
                }
            ],
            warning: 'Never connect the negative jumper clamp to the dead battery negative terminal directly; sparks can ignite hydrogen gas venting from lead-acid cells.',
            proTip: 'If the starter clicks once and refuses to turn, gently tapping the starter motor housing with a wrench while an assistant turns the key can free sticky brushes to get you home.',
            supportPrompt: 'My car won\'t start and makes a rapid clicking sound under the hood when I turn the key.'
        },
        {
            id: 'smart-tv-black-screen-sound-working',
            category: 'tv',
            categoryLabel: 'Smart TV & Audio',
            tagClass: 'tv',
            title: 'Smart TV Has Black Screen but Sound Still Plays (Samsung, LG, Sony, TCL)',
            readTime: '5 min read',
            difficulty: 'Intermediate',
            author: {
                name: 'David Miller',
                role: 'Senior Electronics & Systems Engineer',
                avatar: 'assets/expert-1.png'
            },
            snippet: 'Audio from TV shows, streaming apps, or HDMI inputs plays clearly, but the display remains completely black.',
            previewSteps: [
                'Perform 60-second power capacitor drain reset',
                'Execute the Flashlight Test to check LCD panel vs backlight LED strips',
                'Inspect HDMI handshake and T-Con board ribbon seating'
            ],
            symptoms: 'Power indicator LED blinks normally, volume responds to remote control, backlight glows faintly or stays dark.',
            cause: 'Blown LED backlight diode string, failed backlight inverter / power board, or shorted T-Con (timing controller) board ribbon cable.',
            steps: [
                {
                    title: 'Perform Hard Power Reset (Capacitor Drain)',
                    content: 'Unplug the TV from the wall outlet. Press and hold the physical power button on the TV chassis (not remote) for a full 60 seconds. Plug directly into wall (bypass surge strip) and turn on.'
                },
                {
                    title: 'Perform the Flashlight Test',
                    content: 'Turn on the TV in a dark room. Play video with sound. Hold your phone flashlight 2 inches from the screen and look closely at an angle. If you can see faint images, logos, or text, your LCD panel is fine and the LED backlight strips have burned out.'
                },
                {
                    title: 'Inspect T-Con Board & Ribbon Connectors',
                    content: 'If the backlight turns on (screen glows dark blue/gray) but no picture appears, the T-Con board ribbon cables may have developed oxidation and require reseating.'
                }
            ],
            warning: 'TV power supply boards store lethal high voltages in large filter capacitors even after being unplugged. Do not touch internal boards without discharging capacitors.',
            proTip: 'If your TV passed the flashlight test, replacement LED backlight strip sets cost under $30 and restore full brightness.',
            supportPrompt: 'My smart TV screen is completely black but the sound and audio work fine.'
        },
        {
            id: 'android-battery-drain-overnight',
            category: 'mobile',
            categoryLabel: 'Smartphones',
            tagClass: 'mobile',
            title: 'Android Phone Battery Draining 30-50% Overnight in Standby (Fixing Rogue Wakelocks)',
            readTime: '5 min read',
            difficulty: 'Beginner',
            author: {
                name: 'James Wilson',
                role: 'Mobile Systems Specialist',
                avatar: 'assets/expert-2.png'
            },
            snippet: 'Phone battery drops precipitously overnight while idle with screen off, and device feels warm to the touch.',
            previewSteps: [
                'Identify background CPU wakelocks in Battery Usage settings',
                'Clear Google Play Services cache and data',
                'Wipe system cache partition via Android Recovery menu'
            ],
            symptoms: 'Battery drops from 100% to 50% overnight without use, high battery percentage attributed to "Google Play Services" or "Android System".',
            cause: 'A corrupted background sync loop preventing the CPU from entering deep sleep ("Doze" mode), often triggered after an OS update.',
            steps: [
                {
                    title: 'Inspect Battery Usage & Restrict Rogue Apps',
                    content: 'Go to <strong>Settings &gt; Battery &gt; Battery Usage</strong>. Tap on apps using &gt;5% battery while screen-off and set Background Usage to <strong>Restricted</strong>.'
                },
                {
                    title: 'Clear Google Play Services Cache',
                    content: 'Go to <strong>Settings &gt; Apps &gt; Google Play Services &gt; Storage &gt; Clear Cache</strong>. Tap Manage Space &gt; Clear All Data. Restart your phone.'
                },
                {
                    title: 'Wipe Cache Partition in Recovery Mode',
                    content: 'Power off phone. Hold <strong>Volume Up + Power</strong> until the recovery screen appears. Use volume keys to highlight <strong>Wipe Cache Partition</strong> and press power to confirm (does NOT delete user data).'
                }
            ],
            warning: 'Do not select "Wipe data / Factory reset" in recovery mode as this will erase your device. Only select "Wipe cache partition".',
            proTip: 'Turn off "Nearby Device Scanning" and "Wi-Fi Scanning" under Location Services to prevent constant background radio pinging.',
            supportPrompt: 'My Android phone battery is draining 40% overnight while sitting on my nightstand.'
        },
        {
            id: 'dog-ate-chocolate-toxicity-protocol',
            category: 'pets',
            categoryLabel: 'Pet & Veterinary',
            tagClass: 'pets',
            title: 'Dog Ingested Chocolate: Toxicity Risk Chart by Weight, Symptoms & Immediate First-Aid',
            readTime: '6 min read',
            difficulty: 'Urgent',
            author: {
                name: 'Dr. Sarah Jenkins',
                role: 'Licensed Veterinary Consultant (DVM)',
                avatar: 'assets/expert-3.png'
            },
            snippet: 'Immediate triage protocol: Determine theobromine toxicity danger level based on dog weight and cocoa concentration.',
            previewSteps: [
                'Identify chocolate type (White vs Milk vs Dark vs Baker\'s / Cocoa Powder)',
                'Calculate mg of theobromine per kg of dog body weight',
                'Identify 2-hour window for safe veterinarian emesis induction'
            ],
            symptoms: 'Hyperactivity, panting, vomiting, diarrhea, increased thirst, elevated heart rate (tachycardia), muscle tremors.',
            cause: 'Dogs metabolize theobromine and caffeine significantly slower than humans, leading to central nervous system overstimulation and cardiac arrhythmias.',
            steps: [
                {
                    title: 'Assess Danger Level by Chocolate Type',
                    content: '<strong>White Chocolate:</strong> Virtually zero theobromine (GI upset risk only). <strong>Milk Chocolate:</strong> ~60 mg theobromine/oz (Mild risk unless large amounts). <strong>Dark Chocolate:</strong> ~150 mg/oz (Moderate to high danger). <strong>Baker\'s Chocolate / Cocoa:</strong> ~400 mg/oz (Extremely toxic in small quantities).'
                },
                {
                    title: 'Determine Dog\'s Weight vs Ounces Ingested',
                    content: 'Mild signs appear at 20 mg/kg; cardiotoxic signs appear at 40-50 mg/kg; seizures appear at &gt;60 mg/kg. For example, 1 oz of Baker\'s chocolate can cause severe toxicity in a 20 lb dog.'
                },
                {
                    title: 'Immediate Clinical Action (The 2-Hour Window)',
                    content: 'If ingestion occurred within the last 2 hours and dog is asymptomatic, veterinary induced vomiting with apomorphine prevents absorption. If showing neurological tremors, do NOT induce vomiting at home.'
                }
            ],
            warning: 'Never attempt to induce vomiting at home using salt, which causes fatal cerebral edema. Only use veterinary guidance.',
            proTip: 'Keep the chocolate wrapper or nutritional panel handy when speaking with a vet so they can calculate the exact cocoa percentage.',
            supportPrompt: 'My dog ate chocolate about 30 minutes ago and I need immediate veterinary triage.'
        },
        {
            id: 'cat-straining-litter-box-urinary-blockage',
            category: 'pets',
            categoryLabel: 'Pet & Veterinary',
            tagClass: 'pets',
            title: 'Cat Straining in Litter Box or Vocalizing (Feline Urethral Obstruction Triage)',
            readTime: '5 min read',
            difficulty: 'Emergency',
            author: {
                name: 'Dr. Sarah Jenkins',
                role: 'Licensed Veterinary Consultant (DVM)',
                avatar: 'assets/expert-3.png'
            },
            snippet: 'Recognizing Feline Lower Urinary Tract Disease (FLUTD) vs life-threatening urethral obstruction in male cats.',
            previewSteps: [
                'Distinguish between constipation and urinary blockage',
                'Gently assess abdomen for hard, grapefruit-sized bladder',
                'Locate nearest 24-hour emergency animal hospital'
            ],
            symptoms: 'Visiting litter box repeatedly with little to no urine produced, crying or howling while squatting, licking genital area constantly, lethargy.',
            cause: 'Urethral obstruction caused by struvite or calcium oxalate crystals, mucous plugs, or severe idiopathic cystitis spasms blocking urine outflow.',
            steps: [
                {
                    title: 'Identify Male Cat Emergency Warning Signs',
                    content: 'Male cats have a narrow urethra that can become completely blocked by microscopic crystals. A complete urethral obstruction is fatal within 24 to 48 hours due to hyperkalemia (potassium toxicity stopping the heart).'
                },
                {
                    title: 'Perform Visual & Litter Inspection',
                    content: 'Check the litter box for fresh wet clumps. If the cat squats for 30 seconds and only produces a few drops with blood tinge, or passes zero urine, this is an emergency.'
                },
                {
                    title: 'Prepare Urgent Clinic Transport',
                    content: 'Do not wait overnight. Call the nearest emergency clinic while en route so veterinary staff can prepare a catheterization suite immediately upon arrival.'
                }
            ],
            warning: 'A blocked cat cannot wait until morning. Toxic bladder pressure causes kidney failure and cardiac arrest rapidly.',
            proTip: 'Long-term prevention requires switching to wet veterinary urinary diets (e.g. Royal Canin Urinary SO or Hill\'s c/d) and filtered water fountains.',
            supportPrompt: 'My cat is straining in the litter box, crying, and producing no urine.'
        },
        {
            id: 'landlord-withholding-security-deposit',
            category: 'legal',
            categoryLabel: 'Legal & Consumer',
            tagClass: 'legal',
            title: 'Landlord Withholding Security Deposit Without Itemized Deductions (Tenant Rights)',
            readTime: '6 min read',
            difficulty: 'Intermediate',
            author: {
                name: 'Arun Patel',
                role: 'Senior Legal & Consumer Rights Consultant',
                avatar: 'assets/expert-4.png'
            },
            snippet: 'How to recover your security deposit when a landlord fails to return funds or provides bad-faith deduction estimates.',
            previewSteps: [
                'Calculate statutory deadline for deposit return (14-30 days by jurisdiction)',
                'Distinguish ordinary wear-and-tear from legitimate tenant damages',
                'Send formal statutory Demand Letter via Certified Mail'
            ],
            symptoms: 'Move-out completed over 30 days ago, landlord has not returned deposit or mailed an itemized deductions statement with receipts.',
            cause: 'Landlords attempting to charge tenants for standard turnover maintenance (paint fading, carpet traffic lanes, minor scuffs) which are legally defined as normal wear and tear.',
            steps: [
                {
                    title: 'Check Your State / Jurisdiction Statutory Window',
                    content: 'Most states mandate deposit return within 14 to 30 days (e.g. California: 21 days; New York: 14 days; Texas: 30 days). If the landlord misses the deadline without written justification, they often forfeit the right to make ANY deductions.'
                },
                {
                    title: 'Assemble Move-In vs Move-Out Photographic Proof',
                    content: 'Compile timestamped photos and videos taken during initial move-in and final walk-through. Landlords cannot deduct for pre-existing conditions or standard carpet depreciation (average 5-7 year lifespan).'
                },
                {
                    title: 'Send Formal Statutory Demand Letter',
                    content: 'Draft a formal letter demanding full return of deposit within 10 business days. Cite your local state civil code and mention statutory bad-faith penalties (many jurisdictions award double or treble damages plus court fees).'
                }
            ],
            warning: 'Always send the demand letter with USPS Certified Mail with Return Receipt Requested so you have admissible proof of receipt for small claims court.',
            proTip: 'In over 80% of cases, landlords settle and remit full deposit funds upon receiving a formal certified demand letter citing treble penalty statutes.',
            supportPrompt: 'My landlord is withholding my security deposit past the legal deadline without an itemized list.'
        },
        {
            id: 'outlook-stuck-on-loading-profile',
            category: 'tech',
            categoryLabel: 'Windows & PC',
            tagClass: 'tech',
            title: 'Microsoft Outlook Stuck on "Loading Profile" or Password Prompt Loop',
            readTime: '4 min read',
            difficulty: 'Beginner',
            author: {
                name: 'David Miller',
                role: 'Senior Windows Systems Engineer',
                avatar: 'assets/expert-1.png'
            },
            snippet: 'Outlook desktop splash screen hangs indefinitely on "Loading Profile..." or prompts for password repeatedly.',
            previewSteps: [
                'Launch Outlook in Safe Mode to bypass corrupt add-ins',
                'Clear stale Windows Credential Manager cached identity tokens',
                'Rebuild Outlook mail profile via Control Panel'
            ],
            symptoms: 'Outlook won\'t open past the splash banner, or displays Modern Authentication pop-ups that close immediately.',
            cause: 'Corrupted hardware graphics acceleration cache, orphaned COM add-in hang (Zoom, Teams, antivirus plugin), or expired OAuth identity tokens in Windows Credential Vault.',
            steps: [
                {
                    title: 'Launch Outlook in Safe Mode',
                    content: 'Press Win + R, type the command below, and press Enter. If Outlook opens instantly, go to File &gt; Options &gt; Add-ins &gt; Manage COM Add-ins &gt; Go &gt; uncheck third-party add-ins.',
                    command: 'outlook.exe /safe'
                },
                {
                    title: 'Purge Stale Credentials in Windows Credential Manager',
                    content: 'Close Outlook. Open Start menu, search <strong>Credential Manager</strong>, and click <strong>Windows Credentials</strong>. Scroll down to Generic Credentials and remove all entries starting with <code>MicrosoftOffice16_Data</code> or <code>MS.Outlook</code>.'
                },
                {
                    title: 'Create Clean New Outlook Profile',
                    content: 'Open Control Panel &gt; Mail (Microsoft Outlook). Click <strong>Show Profiles</strong> &gt; Add. Enter a new name, enter email credentials, and set "Always use this profile".'
                }
            ],
            warning: 'Never delete your existing profile before creating and verifying the new profile connects, especially if you have local POP3 .PST archive folders.',
            proTip: 'Deleting the folder %localappdata%\\Microsoft\\Outlook\\RoamCache clears corrupt autocomplete nicknames and navigation cache without affecting emails.',
            supportPrompt: 'Microsoft Outlook is stuck on the splash screen saying Loading Profile and won\'t open.'
        },
        {
            id: 'dishwasher-cloudy-film-standing-water',
            category: 'appliances',
            categoryLabel: 'Home Appliances',
            tagClass: 'appliances',
            title: 'Dishwasher Leaving Cloudy White Film on Glasses & Standing Water in Basin',
            readTime: '5 min read',
            difficulty: 'Beginner',
            author: {
                name: 'Michael Torres',
                role: 'Master Appliance Technician',
                avatar: 'assets/expert-3.png'
            },
            snippet: 'Dishes come out gritty with a chalky white film, and a dirty puddle remains under the lower dish rack.',
            previewSteps: [
                'Unclog and deep clean lower spray arm water jets',
                'Remove and scrub circular micro-mesh sump filter',
                'Check high-loop drain hose and disposal knockout plug'
            ],
            symptoms: 'Water will not drain at end of cycle, glasses have hazy etched appearance, food particles baked onto plates.',
            cause: 'Hard water mineral scale clogging spray arm holes, food sediment blocking the sump filter screen, or a newly installed garbage disposal with un-removed drain plug.',
            steps: [
                {
                    title: 'Clean the Lower Sump Filter Screen',
                    content: 'Remove the bottom rack. Twist the cylindrical filter counter-clockwise and pull up. Wash under hot running water with dish soap and a soft brush to remove grease buildup and lime scale.'
                },
                {
                    title: 'Inspect Lower Spray Arm Jets for Seeds & Toothpicks',
                    content: 'Unsnap the lower spray arm. Inspect the tiny water spray nozzles at the ends. Use a wooden toothpick to poke out watermelon seeds, calcium chunks, and glass fragments that starve water pressure.'
                },
                {
                    title: 'Run a Citric Acid or White Vinegar De-scaling Cycle',
                    content: 'Place a dishwasher-safe bowl containing 2 cups of white vinegar on the top rack. Run the hottest sanitizing wash cycle with the dishwasher empty to dissolve hard water mineral film.'
                }
            ],
            warning: 'If you recently installed a new garbage disposal under your sink, verify the plastic inner knockout plug was punched out before connecting the dishwasher drain hose.',
            proTip: 'Using a rinse aid (like Finish Jet-Dry) alters water surface tension and prevents mineral droplets from evaporating into white calcium stains on glassware.',
            supportPrompt: 'My dishwasher is leaving a cloudy white film on my dishes and water won\'t drain from the bottom.'
        },
        {
            id: 'squealing-brakes-chirp-stopping',
            category: 'auto',
            categoryLabel: 'Automotive',
            tagClass: 'auto',
            title: 'Squealing Brakes When Stopping: Brake Pad Wear Indicator vs Rotor Glazing',
            readTime: '5 min read',
            difficulty: 'Intermediate',
            author: {
                name: 'Robert Chen',
                role: 'Master Automotive Technician (ASE)',
                avatar: 'assets/expert-4.png'
            },
            snippet: 'High-pitched metal squeal when applying brakes or continuous light chirp that vanishes when pressing pedal hard.',
            previewSteps: [
                'Measure remaining friction pad lining thickness through wheel spokes',
                'Inspect rotor friction face for grooves and blue heat glazing',
                'Check caliper slide pin lubrication and anti-rattle clip tension'
            ],
            symptoms: 'Squeal sounds like metal fingernails on chalkboard, vibration through pedal, or morning brake noise.',
            cause: 'Brake pad acoustic wear indicator contact tab touching rotor, glazed friction material from overheating, or missing anti-vibration shims on brake calipers.',
            steps: [
                {
                    title: 'Distinguish Normal Morning Moisture from Critical Wear',
                    content: 'Morning squeal after rain that disappears after 2-3 stops is caused by harmless flash surface rust on iron rotors. A consistent squeal heard every single stop indicates worn pads.'
                },
                {
                    title: 'Visual Inspection of Pad Lining Thickness',
                    content: 'Look through wheel spokes with a flashlight. Safe brake pad lining is 8-12mm when new. If the friction material is <strong>3mm or thinner</strong>, the metal wear indicator tab is scraping the rotor.'
                },
                {
                    title: 'Check Caliper Slide Pins & Hardware',
                    content: 'Stuck or unlubricated caliper slide pins cause uneven pad wear and drag. Clean pins and apply synthetic silicone ceramic brake lubricant.'
                }
            ],
            warning: 'If brake squeal turns into a grinding, crunching metal-on-metal noise, the friction material is 100% gone and continuing to drive will destroy the brake calipers and rotors.',
            proTip: 'Ceramic brake pads produce virtually zero black brake dust and operate much quieter than semi-metallic pads for daily driving.',
            supportPrompt: 'My brakes are making a high-pitched squealing noise every time I slow down.'
        }
    ];

    // ===== 8 In-Depth Comprehensive FAQs =====
    const faqData = [
        {
            q: 'How does AnswerDesk\'s 3-step diagnostic matching work?',
            a: '<p>AnswerDesk uses an intelligent diagnostic intake process rather than a generic ticketing system:</p><ul><li><strong>Step 1: Problem Intake</strong> — You describe the issue, symptoms, or error code in our private support portal.</li><li><strong>Step 2: Category &amp; Specialist Routing</strong> — Our system analyzes your specific hardware, software version, or situation and pairs you with a verified, credentialed specialist (e.g., Windows Systems Engineer, ASE Master Mechanic, Licensed Veterinarian).</li><li><strong>Step 3: Rapid Connection</strong> — You are connected in under 2 minutes for interactive diagnostic guidance via live chat, phone call, or secure screen share.</li></ul>'
        },
        {
            q: 'Are the specialists real certified professionals or automated AI bots?',
            a: '<p>Every consultation is conducted with <strong>real, verified human professionals</strong>. While an AI assistant facilitates initial symptom intake and triages your technical details to save time, the actual diagnosis and troubleshooting guidance is delivered directly by credentialed specialists.</p><p>Our specialists include ASE-certified master mechanics, Apple Certified Support Professionals, Microsoft Certified Systems Engineers, licensed veterinarians (DVM), bar-admitted attorneys, and licensed appliance technicians with years of hands-on field experience.</p>'
        },
        {
            q: 'What if a troubleshooting article or guide doesn\'t fix my specific model?',
            a: '<p>Modern devices feature thousands of firmware revisions, model variations, and unique configuration conflicts. Static articles solve standard root causes, but unique quirks often require hands-on troubleshooting.</p><p>If a guide doesn\'t completely resolve your issue, simply click the <strong>"Ask Our Support Team"</strong> button. Our specialists will review the steps you already tried and perform a custom diagnostic tailored to your exact device make, model, and error code.</p>'
        },
        {
            q: 'How does the "Pay After Solution" guarantee work?',
            a: '<p>AnswerDesk operates on a solution-first standard: <strong>we do not believe you should pay for incomplete answers or unhelpful suggestions</strong>.</p><p>There are zero upfront retainers. Your specialist works with you step-by-step until your question is answered and your problem is resolved to your complete satisfaction. If we are unable to diagnose or solve your issue, you pay nothing.</p>'
        },
        {
            q: 'Can I get help via a direct phone call, screen share, or live chat?',
            a: '<p>Yes! AnswerDesk offers flexible omnichannel support depending on your comfort and the complexity of your issue:</p><ul><li><strong>Live Chat</strong> — Convenient for sending screenshots, error codes, and step-by-step checklists.</li><li><strong>Direct Phone Consultation</strong> — Perfect for automotive issues, appliances, or complex situations where talking live with a verified engineer is fastest.</li><li><strong>Secure Screen Sharing</strong> — Ideal for tricky Windows/Mac software glitches, email setups, and printer configurations where you want the specialist to pinpoint the fix directly on screen.</li></ul>'
        },
        {
            q: 'What categories, brands, and device types does AnswerDesk support?',
            a: '<p>AnswerDesk covers virtually every major consumer and professional category:</p><ul><li><strong>Tech &amp; Computers:</strong> Windows 10/11, macOS, Linux, HP, Dell, Lenovo, Asus, Acer, printers, routers, and networks.</li><li><strong>Smartphones &amp; Tablets:</strong> Apple iPhone, iPad, Samsung Galaxy, Google Pixel, and Android tablets.</li><li><strong>Home Appliances &amp; HVAC:</strong> Samsung, LG, Whirlpool, GE, Maytag, Bosch, Sub-Zero refrigerators, washers, dryers, and ovens.</li><li><strong>Automotive &amp; OBD-II:</strong> Domestic, Asian, and European vehicle diagnostic codes, starting faults, electrical issues, and brakes.</li><li><strong>Specialized Advisory:</strong> Veterinary triage &amp; pet wellness, medical symptom guidance, and tenant/consumer rights consultation.</li></ul>'
        },
        {
            q: 'What information should I have ready before connecting with an expert?',
            a: '<p>To ensure the fastest possible resolution, having the following details ready is helpful:</p><ul><li>The exact brand, model number, and year of the device, appliance, or vehicle.</li><li>The exact wording of any error messages or diagnostic codes (e.g. 0x0000011b, P0420, OE).</li><li>What happened immediately before the issue began (e.g. recent software update, power surge, strange noise).</li><li>Any troubleshooting steps you have already attempted so the specialist doesn\'t make you repeat them.</li></ul>'
        },
        {
            q: 'How are my personal data, privacy, and payment security protected?',
            a: '<p>We enforce rigorous enterprise security standards:</p><ul><li>All chats, diagnostic transmissions, and phone connections are encrypted with <strong>256-bit TLS 1.3 encryption</strong>.</li><li>We maintain a strict <strong>Zero Data Sharing</strong> policy — your personal contact information is never sold, shared, or distributed to third-party advertisers.</li><li>All transactions are processed through Level 1 PCI-DSS certified payment processors. Specialists never see your financial card details.</li></ul>'
        }
    ];

    // ===== State =====
    let activeCategory = 'all';
    let searchQuery = '';

    // ===== DOM Elements =====
    const kbGrid = document.getElementById('kbGrid');
    const kbCount = document.getElementById('kbCount');
    const kbSearchInput = document.getElementById('kbSearchInput');
    const kbSearchClear = document.getElementById('kbSearchClear');
    const kbFilterPills = document.getElementById('kbFilterPills');
    const kbZeroResults = document.getElementById('kbZeroResults');
    const kbZeroQuery = document.getElementById('kbZeroQuery');
    const kbZeroAskBtn = document.getElementById('kbZeroAskBtn');
    const kbModal = document.getElementById('kbModal');
    const kbModalClose = document.getElementById('kbModalClose');
    const kbModalContent = document.getElementById('kbModalContent');
    const faqAccordion = document.getElementById('faqAccordion');

    if (!kbGrid && !faqAccordion) return; // Exit if elements not present

    // ===== Helper: Bridge to Support Chat =====
    function bridgeToSupportChat(initialText) {
        // Smooth scroll to hero / chatPanel
        const chatPanel = document.getElementById('chatPanel') || document.getElementById('hero');
        if (chatPanel) {
            chatPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        const chatInput = document.getElementById('chatInput');
        const startChatBtn = document.getElementById('startChatBtn');

        if (chatInput && initialText) {
            chatInput.value = initialText;
            chatInput.focus();

            // Give user a visual highlight on the chat box
            chatInput.style.transition = 'all 0.3s ease';
            chatInput.style.borderColor = '#3b82f6';
            chatInput.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.25)';
            setTimeout(() => {
                chatInput.style.borderColor = '';
                chatInput.style.boxShadow = '';
            }, 2000);
        }
    }

    // ===== Render Article Cards =====
    function renderArticles() {
        if (!kbGrid) return;

        const filtered = kbArticles.filter(art => {
            const matchesCategory = (activeCategory === 'all' || art.category === activeCategory);
            const q = searchQuery.toLowerCase().trim();
            const matchesSearch = !q || (
                art.title.toLowerCase().includes(q) ||
                art.snippet.toLowerCase().includes(q) ||
                art.symptoms.toLowerCase().includes(q) ||
                art.cause.toLowerCase().includes(q) ||
                art.categoryLabel.toLowerCase().includes(q)
            );
            return matchesCategory && matchesSearch;
        });

        // Update count badge
        if (kbCount) {
            kbCount.textContent = `Showing ${filtered.length} of ${kbArticles.length} verified guides`;
        }

        if (filtered.length === 0) {
            kbGrid.innerHTML = '';
            if (kbZeroResults) {
                kbZeroResults.style.display = 'block';
                if (kbZeroQuery) kbZeroQuery.textContent = searchQuery ? `"${searchQuery}"` : 'this issue';
                if (kbZeroAskBtn) {
                    kbZeroAskBtn.innerHTML = `Ask Our Support Team About ${searchQuery ? `"${searchQuery}"` : 'Your Issue'} &rarr;`;
                    kbZeroAskBtn.onclick = () => {
                        bridgeToSupportChat(searchQuery || 'I need help diagnosing an issue');
                    };
                }
            }
            return;
        }

        if (kbZeroResults) kbZeroResults.style.display = 'none';

        kbGrid.innerHTML = filtered.map(art => `
            <article class="kb-card" data-id="${art.id}">
                <div>
                    <div class="kb-card-header">
                        <span class="kb-cat-tag ${art.tagClass}">${art.categoryLabel}</span>
                        <span class="kb-read-time">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            ${art.readTime} &bull; ${art.difficulty}
                        </span>
                    </div>
                    <h3 class="kb-card-title">${art.title}</h3>
                    <p class="kb-card-snippet">${art.snippet}</p>
                    <div class="kb-checklist-preview">
                        ${art.previewSteps.map(step => `
                            <div class="kb-checklist-item">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                <span>${step}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="kb-card-footer">
                    <div class="kb-author">
                        <img src="${art.author.avatar}" alt="${art.author.name}" class="kb-author-img" width="32" height="32" loading="lazy">
                        <div class="kb-author-info">
                            <span class="kb-author-name">${art.author.name} <span class="tick">&#10003;</span></span>
                            <span class="kb-author-role">Verified Reviewer</span>
                        </div>
                    </div>
                    <span class="kb-card-action">
                        View Guide &rarr;
                    </span>
                </div>
            </article>
        `).join('');

        // Attach click listeners to cards
        kbGrid.querySelectorAll('.kb-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.getAttribute('data-id');
                openArticleModal(id);
            });
        });
    }

    // ===== Open Article Modal Reader =====
    function openArticleModal(id) {
        const art = kbArticles.find(a => a.id === id);
        if (!art || !kbModal || !kbModalContent) return;

        kbModalContent.innerHTML = `
            <div class="kb-modal-expert-bar">
                <img src="${art.author.avatar}" alt="${art.author.name}" class="kb-modal-expert-img" width="44" height="44">
                <div>
                    <strong style="color: #1e293b; font-size: 14px; display: block;">Reviewed &amp; Certified by ${art.author.name} &#10003;</strong>
                    <span style="color: #64748b; font-size: 12px;">${art.author.role} &bull; AnswerDesk Senior Engineering Board</span>
                </div>
            </div>

            <div class="kb-modal-tags">
                <span class="kb-cat-tag ${art.tagClass}">${art.categoryLabel}</span>
                <span class="kb-cat-tag" style="background: #f1f5f9; color: #475569;">${art.readTime}</span>
                <span class="kb-cat-tag" style="background: #f1f5f9; color: #475569;">Level: ${art.difficulty}</span>
            </div>

            <h2 class="kb-modal-title">${art.title}</h2>

            <div class="kb-modal-body">
                <h4>Primary Symptoms &amp; Failure Signs</h4>
                <p>${art.symptoms}</p>

                <h4>Technical Root Cause</h4>
                <p>${art.cause}</p>

                <h4>Step-by-Step Diagnostic &amp; Resolution Protocol</h4>
                ${art.steps.map((st, idx) => `
                    <div class="kb-step-box">
                        <div class="kb-step-num">Step ${idx + 1}</div>
                        <div class="kb-step-title">${st.title}</div>
                        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #334155;">${st.content}</p>
                        ${st.command ? `
                            <div class="kb-code-box">
                                <code>${st.command}</code>
                                <span style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Command</span>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}

                ${art.warning ? `
                    <div class="kb-warning-box">
                        <strong>Safety &amp; Prevention Warning:</strong> ${art.warning}
                    </div>
                ` : ''}

                ${art.proTip ? `
                    <p style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 8px; font-size: 14px; color: #1e40af;">
                        <strong>Pro Specialist Tip:</strong> ${art.proTip}
                    </p>
                ` : ''}

                <div class="kb-feedback-wrap">
                    <span style="font-size: 14px; font-weight: 700; color: #1e293b;">Did this guide solve your issue?</span>
                    <div class="kb-feedback-btns">
                        <button class="kb-feedback-btn" id="kbSolvedYes">&#128077; Yes, Solved!</button>
                        <button class="kb-feedback-btn" id="kbSolvedNo">&#128078; Still Having Trouble</button>
                    </div>
                </div>

                <div class="kb-modal-bridge-card">
                    <div class="kb-modal-bridge-text">
                        <h4>Facing a tricky variation or want a specialist to walk you through it?</h4>
                        <p>Our verified ${art.categoryLabel} specialists are online 24/7 to solve your exact situation.</p>
                    </div>
                    <button class="kb-modal-bridge-btn" id="kbBridgeBtn">Connect with Specialist &rarr;</button>
                </div>
            </div>
        `;

        kbModal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Connect with specialist button handler
        const bridgeBtn = document.getElementById('kbBridgeBtn');
        if (bridgeBtn) {
            bridgeBtn.addEventListener('click', () => {
                closeArticleModal();
                bridgeToSupportChat(art.supportPrompt);
            });
        }

        // Feedback buttons
        const solvedYes = document.getElementById('kbSolvedYes');
        const solvedNo = document.getElementById('kbSolvedNo');
        if (solvedYes) {
            solvedYes.addEventListener('click', () => {
                solvedYes.style.background = '#10b981';
                solvedYes.style.color = '#ffffff';
                solvedYes.textContent = '✓ Glad it helped!';
            });
        }
        if (solvedNo) {
            solvedNo.addEventListener('click', () => {
                closeArticleModal();
                bridgeToSupportChat(art.supportPrompt);
            });
        }
    }

    // ===== Close Article Modal =====
    function closeArticleModal() {
        if (!kbModal) return;
        kbModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (kbModalClose) {
        kbModalClose.addEventListener('click', closeArticleModal);
    }
    if (kbModal) {
        kbModal.addEventListener('click', (e) => {
            if (e.target === kbModal) closeArticleModal();
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && kbModal && kbModal.classList.contains('active')) {
            closeArticleModal();
        }
    });

    // ===== Search & Filter Handlers =====
    if (kbSearchInput) {
        kbSearchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            if (kbSearchClear) {
                kbSearchClear.style.display = searchQuery ? 'block' : 'none';
            }
            renderArticles();
        });
    }

    if (kbSearchClear) {
        kbSearchClear.addEventListener('click', () => {
            if (kbSearchInput) {
                kbSearchInput.value = '';
                searchQuery = '';
                kbSearchClear.style.display = 'none';
                kbSearchInput.focus();
                renderArticles();
            }
        });
    }

    if (kbFilterPills) {
        kbFilterPills.querySelectorAll('.kb-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                kbFilterPills.querySelectorAll('.kb-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                activeCategory = pill.getAttribute('data-cat');
                renderArticles();
            });
        });
    }

    // ===== Render FAQ Accordion =====
    function renderFAQ() {
        if (!faqAccordion) return;

        faqAccordion.innerHTML = faqData.map((item, idx) => `
            <div class="faq-item ${idx === 0 ? 'active' : ''}">
                <button class="faq-question" id="faqHeader${idx}" aria-expanded="${idx === 0 ? 'true' : 'false'}" aria-controls="faqAnswer${idx}">
                    <span>${item.q}</span>
                    <svg class="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div class="faq-answer" id="faqAnswer${idx}" role="region" aria-labelledby="faqHeader${idx}">
                    <div class="faq-answer-inner">
                        ${item.a}
                    </div>
                </div>
            </div>
        `).join('');

        // Attach Accordion Toggle
        faqAccordion.querySelectorAll('.faq-question').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = btn.closest('.faq-item');
                const isOpen = item.classList.contains('active');

                // Toggle current item
                if (isOpen) {
                    item.classList.remove('active');
                    btn.setAttribute('aria-expanded', 'false');
                } else {
                    item.classList.add('active');
                    btn.setAttribute('aria-expanded', 'true');
                }
            });
        });
    }

    // ===== Initialization =====
    renderArticles();
    renderFAQ();

    // Check URL parameters for direct article opening (Deep Linking for SEO)
    const urlParams = new URLSearchParams(window.location.search);
    const requestedArticle = urlParams.get('article');
    if (requestedArticle) {
        setTimeout(() => {
            openArticleModal(requestedArticle);
        }, 300);
    }
})();
