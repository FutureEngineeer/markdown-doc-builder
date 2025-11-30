const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Прикольные слоганы для каждого типа ошибки
const errorMessages = {
  400: [
    "Syntax error in reality",
    "You divided by zero, didn't you?",
    "Input logic = NULL",
    "PC load letter? Seriously?",
    "Your request is invalid (lol)",
    "Bad bits received",
    "Protocol violation detected",
    "JSON parse error: Life",
    "Stop speaking binary gibberish",
    "That request was sus",
    "Layer 8 issue detected",
    "Garbage in, garbage out",
    "Buffer overflow in your logic",
    "Please recompile your request",
    "Malformed packet, sad robot",
    "You broke the parser",
    "RTFM and try again",
    "Check your checksums",
    "Illegal instruction (literally)",
    "Request refused: Too chaotic"
  ],
  401: [
    "Nice try, hackers",
    "Sudo make me a sandwich",
    "Access denied (voice of god)",
    "Where is your API key?",
    "No token, no party",
    "Auth header missing",
    "Who goes there?",
    "Strictly confidential stuff",
    "Security clearance revoked",
    "401: Thou shall not pass",
    "Login or get out",
    "Identify yourself, human",
    "Credentials rejected",
    "Not on the sudoers list",
    "Firewall says NO",
    "Wrong password, try 'admin'",
    "Keys or it didn't happen",
    "Ghost in the shell only",
    "Fingerprint not recognized",
    "Biometrics failed"
  ],
  402: [
    "Insert coin to continue",
    "Premium content only",
    "Show me the crypto",
    "Trial period ended 1970",
    "Gas fees too high",
    "Insufficient credits",
    "Donate coffee to unlock",
    "Paywall hit hard",
    "Freeloader detected",
    "Money buffer empty",
    "Upgrade your plan",
    "Demo mode expired",
    "Your wallet is 404",
    "Send Bitcoin to proceed",
    "Cloud isn't free, bro",
    "Bandwidth bills pending",
    "SaaS life is hard",
    "Microtransaction needed",
    "Card declined (sad noise)",
    "Need gold to respawn"
  ],
  403: [
    "Verboten!",
    "Touch grass instead",
    "Root access only",
    "Get off my lawn",
    "Classified info",
    "Permission denied (-rwx)",
    "Not for your eyes",
    "Area 51 security level",
    "Don't touch the prod DB",
    "Admin territory",
    "You have no power here",
    "Directory listing? Nope",
    "Chmod 777 won't help",
    "Blacklisted IP",
    "Forbidden fruit",
    "Server hates you",
    "Read-only file system",
    "Security drone deployed",
    "Go away, script kiddie",
    "Access level: Peasant"
  ],
  404: [
    "Works on my machine",
    "Did you git pull?",
    "Deployed on Friday, RIP",
    "TODO: Fix this later",
    "Forgot to commit, sorry",
    "Merge conflict in production",
    "Hot fix broke everything",
    "Should've read the docs",
    "Unit tests? What's that?",
    "Pushed to prod by mistake",
    "Hardcoded path not found",
    "Technical debt paid off",
    "Code review skipped",
    "Rollback didn't help",
    "Race condition won",
    "Undefined behavior lol",
    "Magic number was wrong",
    "Segfault in your logic",
    "Memory leak finally hit",
    "Deadline was yesterday",
    "Feature not in sprint",
    "Copy-paste went wrong",
    "Stack Overflow betrayed us",
    "Rubber duck debugging time",
    "Coffee machine broken too",
    "It's always DNS",
    "Token expired ages ago",
    "Index missing, whoops",
    "Timeout before timeout",
    "Core dumped successfully",
    "Division by zero again",
    "Integer overflow oops",
    "Floating point sadness",
    "Null pointer says hi",
    "Dangling pointer dance",
    "Nothing here but void",
    "The cake is a lie",
    "Page got garbage collected",
    "Pointer to nowhere",
    "404: Brain not found",
    "Lost in the matrix",
    "Quantum superposition failed",
    "Ghost page",
    "Link rot is real",
    "Page left the chat",
    "Just empty whitespace",
    "Entropy claimed this URL",
    "Looks like a typo",
    "Abyss staring back",
    "Function returned void",
    "Memory address invalid",
    "Deprecated and removed",
    "Checksum mismatch",
    "Resource allocation failed",
    "Compiler couldn't find it",
    "Git blame this URL",
    "Production hotfix needed",
    "Legacy code deleted",
    "Assertion failed: Page?",
    "Variable out of scope",
    "Floating point exception",
    "Bus error (core dumped)",
    "Brainrot occurred",
    "Magic smoke escaped here",
    "Ohm's law violation",
    "Flash memory erased",
    "Page exists in parallel universe",
    "Schrödinger's URL",
    "Heisenberg uncertainty applies",
    "Page deleted by entropy",
    "Information paradox hit",
    "Event horizon crossed",
    "Time dilation error",
    "Causality violation",
    "Wavefunction collapsed badly",
    "404: Simulation glitch",
    "NPC dialogue not found"
    ],
  500: [
    "Server on fire",
    "Code spaghetti incident",
    "We broke the internet",
    "Unexpected segfault",
    "Monkeys typing code",
    "Server did a barrel roll",
    "Uncaught Exception: OOPS",
    "Panic at the kernel",
    "Memory leak detected",
    "Backend is crying",
    "Rust compiler panicked",
    "Null pointer dereference",
    "Turbofans spinning up",
    "It works on my machine!",
    "Firmware update gone wrong",
    "Infinite loop started",
    "Server needs coffee",
    "Critical stack overflow",
    "Magic smoke escaped",
    "Deploying hotfix."
  ],
  501: [
    "TODO: Fix this later",
    "Feature coming soon™",
    "Lazy devs at work",
    "Method not stubbed",
    "Not in the roadmap",
    "Ask again in 2030",
    "Implementation pending",
    "Just a placeholder",
    "Under construction",
    "Code not written yet",
    "501: I just can't",
    "Future DLC content",
    "Capability missing",
    "Abstract class error",
    "Devs are sleeping",
    "Check back next commit",
    "Empty function body",
    "Wishful thinking",
    "API endpoint void",
    "Project abandoned?"
  ],
  502: [
    "Gateway drug? No",
    "Upstream is down",
    "Nginx is confused",
    "Proxy handshake failed",
    "Middleman dropped the ball",
    "Backend unreachable",
    "The bridge collapsed",
    "Signal lost in cables",
    "Bad vibes from upstream",
    "Load balancer tripped",
    "Connection refused",
    "Packet lost in transit",
    "Route unreachable",
    "Reverse proxy says no",
    "Network gremlins",
    "Someone cut the fiber",
    "Wrong port, maybe?",
    "Data stream broken",
    "Communication breakdown",
    "Echo... echo... echo."
  ],
  503: [
    "Server needs a nap",
    "Too many requests",
    "Maintenance mode ON",
    "CPU at 100%",
    "DDoS or just popular?",
    "Scaling autoscaling group",
    "Out to lunch",
    "Retry-After: 3600s",
    "Database locked up",
    "Traffic jam ahead",
    "System overloaded",
    "Cooling fans maxed",
    "Capacity exceeded",
    "Be back in a jiffy",
    "Server meltdown imminent",
    "Queue is full",
    "Resource exhaustion",
    "Deploy in progress",
    "Hug of death",
    "Temporarily bricked"
  ],
  504: [
    "Too slow, didn't load",
    "Server fell asleep",
    "Response timed out",
    "Latency killed the cat",
    "Packet took a detour",
    "Ping: 9999ms",
    "Waiting for Godot",
    "Request died of old age",
    "Time limit exceeded",
    "Upstream is lagging",
    "Connection zombie",
    "Still loading... maybe",
    "Database query hung",
    "Deadlock detected",
    "Slow internet vibes",
    "504: Patience test",
    "Hanging on the wire",
    "TTL expired",
    "Infinite wait loop",
    "Did it crash? Probably"
  ]
};

// Определение типов ошибок
const errorTypes = [
  { code: 400, title: 'Bad Request' },
  { code: 401, title: 'Unauthorized' },
  { code: 402, title: 'Payment Required' },
  { code: 403, title: 'Forbidden' },
  { code: 404, title: 'Page Not Found' },
  { code: 500, title: 'Internal Server Error' },
  { code: 501, title: 'Not Implemented' },
  { code: 502, title: 'Bad Gateway' },
  { code: 503, title: 'Service Unavailable' },
  { code: 504, title: 'Gateway Timeout' }
];

/**
 * Генерация HTML страницы ошибки
 */
function generateErrorPageHTML(errorCode, errorTitle, config) {
  const siteName = config.site.name || 'creapunk';
  const siteTitle = config.site.title || 'motion control systems';
  const logoPath = config.icons.site.logo || './assets/creapunk-icon.svg';
  const homeUrl = config.site.logoClickUrl || 'index.html';
  const messages = errorMessages[errorCode] || errorMessages[404];
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${errorCode} - ${errorTitle} | ${siteName}</title>
<link rel="stylesheet" href="assets/styles/error-page.css">
</head>
<body>
<canvas id="canvas"></canvas>
<div class="content">
  <div class="logo-container">
    <img src="${logoPath}" alt="${siteName}" class="logo">
    <div class="site-name">${siteName}</div>
  </div>
  <h1 class="hero glitch layers" data-text="${errorCode}"><span>${errorCode}</span></h1>
  <h2 style="margin-top: 20px; color: #fff;" id="errorMessage">${errorTitle}</h2>
  <a href="${homeUrl}">← Back to Home</a>
</div>
<script>
// Случайный выбор сообщения об ошибке
const messages = ${JSON.stringify(messages)};
const randomMessage = messages[Math.floor(Math.random() * messages.length)];
document.getElementById('errorMessage').textContent = randomMessage;
</script>
<script src="assets/scripts/error-page.js"></script>
</body>
</html>`;
}

/**
 * Генерация всех страниц ошибок
 */
function generateErrorPages(configPath = null, outputDir = null) {
  // Загрузка конфигурации
  const cfgPath = configPath || path.join(__dirname, '..', 'config.yaml');
  const config = yaml.load(fs.readFileSync(cfgPath, 'utf8'));
  
  // Определение выходной директории
  const outDir = outputDir || path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  // Генерация страниц
  errorTypes.forEach(({ code, title }) => {
    const html = generateErrorPageHTML(code, title, config);
    const filename = `${code}.html`;
    const filepath = path.join(outDir, filename);
    
    fs.writeFileSync(filepath, html, 'utf8');
    console.log(`   ✓ Generated ${filename}`);
  });
  
  console.log(`\n   ✨ Generated ${errorTypes.length} error pages`);
}

module.exports = {
  generateErrorPages,
  generateErrorPageHTML,
  errorTypes,
  errorMessages
};
