#!/usr/bin/env node
// cli.js — Fieldr cold-email CLI for Irish SMEs.
//
// Zero dependencies. Run with:  node cli.js <command> [args]
// Data lives in .data/prospects.json (created automatically on first run).

const fs = require("fs");
const path = require("path");
const seed = require("./seed");
const config = require("./config");
const { buildEmail } = require("./templates");

// ---------------------------------------------------------------- storage
const DATA_DIR = path.join(__dirname, ".data");
const DATA_FILE = path.join(DATA_DIR, "prospects.json");

const TYPE_LABELS = {
  gym: "Gym",
  car_dealer: "Car Dealer",
  restaurant: "Restaurant",
  solicitor: "Solicitor",
  accountant: "Accountant",
  beauty_salon: "Beauty Salon",
};

// Accept friendly aliases on the command line ("gym", "car", "salon"...).
const TYPE_ALIASES = {
  gym: "gym", gyms: "gym",
  car: "car_dealer", cars: "car_dealer", car_dealer: "car_dealer",
  dealer: "car_dealer", dealers: "car_dealer", motors: "car_dealer",
  restaurant: "restaurant", restaurants: "restaurant", food: "restaurant",
  solicitor: "solicitor", solicitors: "solicitor", legal: "solicitor", law: "solicitor",
  accountant: "accountant", accountants: "accountant", accounting: "accountant",
  beauty: "beauty_salon", salon: "beauty_salon", salons: "beauty_salon", beauty_salon: "beauty_salon",
};

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const prospects = seed.map((p, i) => ({
      id: i + 1,
      ...p,
      status: "new", // new -> contacted -> replied
      contactedAt: null,
      followupDate: null,
      replies: [],
      history: [{ at: new Date().toISOString(), event: "added to list" }],
    }));
    fs.writeFileSync(DATA_FILE, JSON.stringify(prospects, null, 2));
    console.log(`\n  ✨ First run — loaded ${prospects.length} Ashbourne prospects into ${path.relative(process.cwd(), DATA_FILE)}\n`);
    return prospects;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// --------------------------------------------------------------- helpers
function findProspect(data, query) {
  if (!query) return { error: "Please give a business name, e.g. email \"Iron House\"" };
  const q = query.toLowerCase().trim();
  const matches = data.filter((p) => p.name.toLowerCase().includes(q));
  if (matches.length === 0) return { error: `No prospect matches "${query}".` };
  if (matches.length > 1) {
    return {
      error: `"${query}" matches ${matches.length} prospects — be more specific:\n` +
        matches.map((m) => `   • ${m.name}`).join("\n"),
    };
  }
  return { prospect: matches[0] };
}

function statusBadge(status) {
  return { new: "⚪ new", contacted: "🔵 contacted", replied: "🟢 replied" }[status] || status;
}

function pad(str, len) {
  str = String(str);
  return str.length >= len ? str.slice(0, len) : str + " ".repeat(len - str.length);
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + Number(n));
  return d;
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IE", { day: "2-digit", month: "short", year: "numeric" });
}

// --------------------------------------------------------------- commands
function cmdList(data, typeArg) {
  let rows = data;
  let title = "All prospects";
  if (typeArg) {
    const type = TYPE_ALIASES[typeArg.toLowerCase()];
    if (!type) {
      console.log(`\n  Unknown type "${typeArg}". Try one of: ${Object.values(TYPE_LABELS).map(t => t.toLowerCase()).join(", ")}\n`);
      return;
    }
    rows = data.filter((p) => p.type === type);
    title = TYPE_LABELS[type] + "s";
  }

  console.log(`\n  ${title} (${rows.length})\n`);
  console.log(
    "  " + pad("#", 4) + pad("Business", 30) + pad("Type", 14) + pad("Contact", 10) + pad("Status", 14) + "Follow-up"
  );
  console.log("  " + "─".repeat(82));
  for (const p of rows) {
    console.log(
      "  " +
        pad(p.id, 4) +
        pad(p.name, 30) +
        pad(TYPE_LABELS[p.type], 14) +
        pad(p.contact, 10) +
        pad(statusBadge(p.status), 14) +
        (p.followupDate ? fmtDate(p.followupDate) : "—")
    );
  }
  console.log("");
}

function cmdEmail(data, query) {
  const { prospect, error } = findProspect(data, query);
  if (error) return console.log(`\n  ${error}\n`);

  const email = buildEmail(prospect, config);
  const line = "─".repeat(70);
  console.log(`\n  ${line}`);
  console.log(`  To:      ${email.to}  (${prospect.contact} @ ${prospect.name})`);
  console.log(`  Subject: ${email.subject}`);
  console.log(`  ${line}\n`);
  console.log(email.body.split("\n").map((l) => "  " + l).join("\n"));
  console.log(`\n  ${line}`);
  console.log(`  💡 Copy/paste the above. When you've sent it, run:  node cli.js sent "${prospect.name}"\n`);
}

function cmdSent(data, query) {
  const { prospect, error } = findProspect(data, query);
  if (error) return console.log(`\n  ${error}\n`);

  prospect.status = prospect.status === "replied" ? "replied" : "contacted";
  prospect.contactedAt = new Date().toISOString();
  prospect.history.push({ at: prospect.contactedAt, event: "marked as sent" });
  saveData(data);
  console.log(`\n  ✅ Marked ${prospect.name} as contacted (${fmtDate(prospect.contactedAt)}).\n`);
}

function cmdReply(data, query, message) {
  const { prospect, error } = findProspect(data, query);
  if (error) return console.log(`\n  ${error}\n`);
  if (!message) return console.log(`\n  Please include the reply text, e.g. reply "Iron House" "Sounds good, send info"\n`);

  const at = new Date().toISOString();
  prospect.replies.push({ at, message });
  prospect.status = "replied";
  prospect.followupDate = null; // got a reply — clear any pending follow-up
  prospect.history.push({ at, event: `reply logged: "${message}"` });
  saveData(data);
  console.log(`\n  🟢 Logged reply from ${prospect.name}:\n     "${message}"\n`);
}

function cmdFollowup(data, query, days) {
  const { prospect, error } = findProspect(data, query);
  if (error) return console.log(`\n  ${error}\n`);

  const n = Number(days);
  if (!days || Number.isNaN(n) || n <= 0) {
    return console.log(`\n  Please give the number of days, e.g. followup "Iron House" 7\n`);
  }
  const due = daysFromNow(n);
  prospect.followupDate = due.toISOString();
  prospect.history.push({ at: new Date().toISOString(), event: `follow-up scheduled for ${fmtDate(due.toISOString())}` });
  saveData(data);
  console.log(`\n  📅 Follow-up for ${prospect.name} scheduled in ${n} day(s) — ${fmtDate(due.toISOString())}.\n`);
}

function cmdReport(data) {
  const total = data.length;
  const contacted = data.filter((p) => p.status === "contacted" || p.status === "replied").length;
  const replied = data.filter((p) => p.status === "replied").length;
  const newCount = data.filter((p) => p.status === "new").length;
  const replyRate = contacted ? Math.round((replied / contacted) * 100) : 0;

  const now = Date.now();
  const dueFollowups = data.filter((p) => p.followupDate && new Date(p.followupDate).getTime() <= now);
  const upcomingFollowups = data.filter((p) => p.followupDate && new Date(p.followupDate).getTime() > now);

  console.log(`\n  📊 Cold Email Report — ${config.company}\n`);
  console.log(`     Total prospects ....... ${total}`);
  console.log(`     Contacted ............. ${contacted}`);
  console.log(`     Replied ............... ${replied}`);
  console.log(`     Not yet contacted ..... ${newCount}`);
  console.log(`     Reply rate ............ ${replyRate}%  (replies ÷ contacted)`);

  // Breakdown by type
  console.log(`\n  By business type:`);
  for (const [type, label] of Object.entries(TYPE_LABELS)) {
    const group = data.filter((p) => p.type === type);
    const c = group.filter((p) => p.status !== "new").length;
    console.log(`     ${pad(label, 14)} ${pad(c + "/" + group.length + " contacted", 18)}`);
  }

  if (dueFollowups.length) {
    console.log(`\n  ⏰ Follow-ups DUE now (${dueFollowups.length}):`);
    dueFollowups.forEach((p) => console.log(`     • ${pad(p.name, 28)} was due ${fmtDate(p.followupDate)}`));
  }
  if (upcomingFollowups.length) {
    console.log(`\n  🗓  Upcoming follow-ups (${upcomingFollowups.length}):`);
    upcomingFollowups
      .sort((a, b) => new Date(a.followupDate) - new Date(b.followupDate))
      .forEach((p) => console.log(`     • ${pad(p.name, 28)} ${fmtDate(p.followupDate)}`));
  }
  if (!dueFollowups.length && !upcomingFollowups.length) {
    console.log(`\n  No follow-ups scheduled.`);
  }
  console.log("");
}

function cmdHelp() {
  console.log(`
  Fieldr Cold Email CLI — manage your Ashbourne outreach

  Usage:  node cli.js <command> [args]

  Commands:
    list                       Show all prospects
    list <type>                Filter by type (gym, car, restaurant,
                               solicitor, accountant, beauty)
    email "<name>"             Generate a personalised email to copy/paste
    sent "<name>"              Mark a prospect as contacted
    reply "<name>" "<message>" Log a reply you received
    followup "<name>" <days>   Schedule a follow-up N days from now
    report                     Show outreach metrics & due follow-ups
    help                       Show this help

  Examples:
    node cli.js list gym
    node cli.js email "Iron House"
    node cli.js sent "Iron House"
    node cli.js followup "Iron House" 7
    node cli.js reply "Iron House" "Sounds good, send me info"
    node cli.js report
`);
}

// ------------------------------------------------------------------- main
function main() {
  const [command, ...args] = process.argv.slice(2);
  const data = loadData();

  switch ((command || "help").toLowerCase()) {
    case "list":      return cmdList(data, args[0]);
    case "email":     return cmdEmail(data, args[0]);
    case "sent":      return cmdSent(data, args[0]);
    case "reply":     return cmdReply(data, args[0], args[1]);
    case "followup":  return cmdFollowup(data, args[0], args[1]);
    case "report":    return cmdReport(data);
    case "help":
    case "--help":
    case "-h":        return cmdHelp();
    default:
      console.log(`\n  Unknown command "${command}". Run:  node cli.js help\n`);
  }
}

main();
