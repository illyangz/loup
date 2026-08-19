/**
 * Seed script — Meridian Education Group demo data for Loup.
 * Run with: pnpm --filter @workspace/scripts run seed
 * All dates are relative to "now" so the demo always looks alive.
 */
import { eq } from "drizzle-orm";
import {
  closeDb,
  db,
  householdsTable,
  membersTable,
  addressesTable,
  categoriesTable,
  providersTable,
  servicesTable,
  reviewsTable,
  bookingsTable,
  bookingEventsTable,
  messagesTable,
  statementsTable,
  billItemsTable,
  paymentMethodsTable,
  packMessagesTable,
  serviceRequestsTable,
  employersTable,
  benefitProgramsTable,
  employeesTable,
  allowanceLedgerTable,
  routinesTable,
  auditEventsTable,
  // education hierarchy
  educationGroupsTable,
  institutionsTable,
  campusesTable,
  departmentsTable,
  benefitPlansTable,
  benefitTiersTable,
  // operational tables
  bookingStatusHistoryTable,
  supportIncidentsTable,
  providerQualityFlagsTable,
  webhookEventsTable,
  // AI advisor tables
  conversations as conversationsTable,
  aiMessages as aiMessagesTable,
  providerAvailabilityTable,
} from "@workspace/db";

const now = new Date();
const minsAgo   = (m: number) => new Date(now.getTime() - m * 60_000);
const hoursAgo  = (h: number) => minsAgo(h * 60);
const daysAgo   = (d: number) => hoursAgo(d * 24);
const inMins    = (m: number) => new Date(now.getTime() + m * 60_000);
const at        = (daysFromNow: number, hour: number, minute = 0) => {
  const d = new Date(now.getTime() + daysFromNow * 24 * 60 * 60_000);
  d.setHours(hour, minute, 0, 0);
  return d;
};
const monthLabel = (d: Date) =>
  d.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "Asia/Dubai" });

async function main() {
  console.log("Clearing existing data...");

  // AI advisor (no dependants)
  await db.delete(aiMessagesTable);
  await db.delete(conversationsTable);

  // Platform / education leaf tables first
  await db.delete(allowanceLedgerTable);
  await db.delete(routinesTable);
  await db.delete(employeesTable);
  await db.delete(benefitProgramsTable);
  await db.delete(auditEventsTable);

  // Operational tables (no FK enforcement)
  await db.delete(bookingStatusHistoryTable);
  await db.delete(supportIncidentsTable);
  await db.delete(providerQualityFlagsTable);
  await db.delete(webhookEventsTable);

  // Booking / billing leaf tables
  await db.delete(billItemsTable);
  await db.delete(bookingEventsTable);
  await db.delete(messagesTable);
  await db.delete(packMessagesTable);
  await db.delete(serviceRequestsTable);
  await db.delete(reviewsTable);
  await db.delete(bookingsTable);
  await db.delete(statementsTable);
  await db.delete(paymentMethodsTable);

  // Catalog
  await db.delete(providerAvailabilityTable);
  await db.delete(servicesTable);
  await db.delete(providersTable);
  await db.delete(categoriesTable);

  // Household
  await db.delete(addressesTable);
  await db.delete(membersTable);
  await db.delete(householdsTable);

  // Employers (legacy)
  await db.delete(employersTable);

  // Education hierarchy (leaf → root)
  await db.delete(benefitTiersTable);
  await db.delete(benefitPlansTable);
  await db.delete(departmentsTable);
  await db.delete(campusesTable);
  await db.delete(institutionsTable);
  await db.delete(educationGroupsTable);

  // ─── Meridian Education Group hierarchy ──────────────────────────────────

  console.log("Seeding Meridian Education Group...");

  const [group] = await db.insert(educationGroupsTable).values({
    name: "Meridian Education Group",
    slug: "meridian-education-group",
    country: "AE",
    active: true,
  }).returning();

  const [institution] = await db.insert(institutionsTable).values({
    groupId: group!.id,
    name: "Meridian International Schools",
    slug: "meridian-international",
    type: "school",
    country: "AE",
    city: "Dubai",
    active: true,
  }).returning();

  const campuses = await db.insert(campusesTable).values([
    { institutionId: institution!.id, name: "Meridian Dubai Hills",  slug: "dubai-hills", city: "Dubai",       active: true },
    { institutionId: institution!.id, name: "Meridian Al Qouz",      slug: "al-qouz",     city: "Dubai",       active: true },
  ]).returning();
  const [dhCampus, aqCampus] = campuses as [typeof campuses[number], typeof campuses[number]];

  await db.insert(departmentsTable).values([
    { campusId: dhCampus!.id, name: "Academic",           slug: "academic"           },
    { campusId: dhCampus!.id, name: "HR & Administration", slug: "hr-admin"          },
    { campusId: dhCampus!.id, name: "IT & Operations",    slug: "it-ops"             },
    { campusId: dhCampus!.id, name: "Student Services",   slug: "student-services"   },
    { campusId: dhCampus!.id, name: "Finance",            slug: "finance"            },
    { campusId: aqCampus!.id, name: "Academic",           slug: "academic-aq"        },
    { campusId: aqCampus!.id, name: "HR & Administration", slug: "hr-admin-aq"       },
    { campusId: aqCampus!.id, name: "Student Services",   slug: "student-services-aq"},
    { campusId: aqCampus!.id, name: "Facilities",         slug: "facilities-aq"      },
  ]);

  const [plan] = await db.insert(benefitPlansTable).values({
    institutionId: institution!.id,
    name: "Meridian Staff Lifestyle Benefits",
    period: "monthly",
    renewalFrequency: "monthly",
    expirationPolicy: "expires_at_period_end",
    rolloverEnabled: false,
    householdAccess: true,
    topUpPermitted: true,
    permittedCategoryIds: [],
    platformFeeRatePct: 8,
    perEmployeeMonthlyFee: 12,
    active: true,
  }).returning();

  const tiers = await db.insert(benefitTiersTable).values([
    { planId: plan!.id, name: "Faculty",        monthlyAllowance: 750, description: "Teaching and academic leadership staff", active: true },
    { planId: plan!.id, name: "Staff",          monthlyAllowance: 500, description: "Professional support and administrative staff", active: true },
    { planId: plan!.id, name: "Administrative", monthlyAllowance: 400, description: "Operations, reception and facilities staff", active: true },
  ]).returning();
  const [facultyTier, staffTier, adminTier] = tiers as [typeof tiers[number], typeof tiers[number], typeof tiers[number]];

  // ─── Legacy employer record (for allowance ledger FK) ────────────────────
  const [employer] = await db.insert(employersTable).values({
    name: "Meridian Education Group",
    slug: "meridian",
    country: "AE",
    active: true,
  }).returning();

  // ─── Household — Mansour family (Omar is a Meridian Faculty member) ──────

  console.log("Seeding Mansour household...");
  const [household] = await db.insert(householdsTable).values({ name: "Mansour Household" }).returning();
  const hid = household!.id;

  const members = await db.insert(membersTable).values([
    { householdId: hid, name: "Omar Mansour",    relation: "Head of household", role: "head",   initials: "OM", monthlySpendLimit: null, isCurrentUser: true  },
    { householdId: hid, name: "Layla Mansour",   relation: "Generations Shaper", role: "owner",  initials: "LM", monthlySpendLimit: null, isCurrentUser: false },
    { householdId: hid, name: "Zayd Mansour",    relation: "Son",               role: "member", initials: "ZM", monthlySpendLimit: 500,  isCurrentUser: false },
    { householdId: hid, name: "Amira Mansour",   relation: "Daughter",          role: "member", initials: "AM", monthlySpendLimit: 300,  isCurrentUser: false },
    { householdId: hid, name: "Rosa Dela Cruz",  relation: "Housekeeper",       role: "member", initials: "RD", monthlySpendLimit: 750,  isCurrentUser: false },
  ]).returning();
  const [omar, layla, zayd, amira, rosa] = members as [
    typeof members[number], typeof members[number], typeof members[number],
    typeof members[number], typeof members[number],
  ];

  const addresses = await db.insert(addressesTable).values([
    { householdId: hid, label: "The Villa",        area: "Jumeirah 3",     street: "Street 17B, Villa 22",          instructions: "Gate code 4412 — providers use the side entrance" },
    { householdId: hid, label: "Dad's Apartment",  area: "Downtown Dubai", street: "Burj Views Tower B, Apt 1204",  instructions: "Leave with concierge if no answer" },
  ]).returning();
  const [villa, apartment] = addresses as [typeof addresses[number], typeof addresses[number]];

  // ─── Service catalog — 7 broad education-aligned categories ─────────────

  console.log("Seeding service catalog...");
  const categories = await db.insert(categoriesTable).values([
    { name: "Household & Life Admin",       slug: "household-admin",    tagline: "Home running smoothly, morning to evening",    icon: "Home",       startingPrice: 85  },
    { name: "Personal Wellbeing",           slug: "personal-wellbeing", tagline: "Beauty, nursing and wellness at your door",     icon: "HeartPulse", startingPrice: 120 },
    { name: "Fitness & Recovery",           slug: "fitness-recovery",   tagline: "Physio, training and yoga — wherever you are", icon: "Dumbbell",   startingPrice: 150 },
    { name: "Mobility & Convenience",       slug: "mobility-convenience", tagline: "Errands and grocery runs, handled",           icon: "Car",        startingPrice: 49  },
    { name: "Family & Dependent Support",   slug: "family-support",     tagline: "Childcare, tutoring and care companions",      icon: "Baby",       startingPrice: 99  },
    { name: "Personal Development",         slug: "personal-development", tagline: "Coaching, tutoring and language learning",    icon: "BookOpen",   startingPrice: 89  },
    { name: "Recreation & Lifestyle",       slug: "recreation-lifestyle", tagline: "Cooking classes, workshops and experiences", icon: "Sparkles",   startingPrice: 75  },
  ]).returning();
  const cat = Object.fromEntries(categories.map((c) => [c.slug, c.id]));

  const providerRows = await db.insert(providersTable).values([
    // Household & Life Admin
    {
      categoryId: cat["household-admin"]!, name: "Marina Shine Cleaning",
      tagline: "The deep-clean specialists of Jumeirah", bio: "A 40-strong team trusted by villas and apartments across Dubai. Eco products, hotel-grade finishing, and the same crew every visit.", rating: 4.9, reviewCount: 312, jobsCompleted: 4820, yearsOnPlatform: 5, verified: true, availableNow: true, responseMinutes: 12, startingPrice: 179, badges: ["Top Rated", "Same Crew Guarantee", "Eco Products"],
    },
    {
      categoryId: cat["household-admin"]!, name: "PressGo Laundry",
      tagline: "Collected tonight, crisp tomorrow", bio: "Door-to-door laundry and pressing with 24-hour turnaround. Delicates handled by hand, kanduras and abayas a speciality.", rating: 4.8, reviewCount: 264, jobsCompleted: 8940, yearsOnPlatform: 4, verified: true, availableNow: true, responseMinutes: 10, startingPrice: 85, badges: ["24h Turnaround"],
    },
    {
      categoryId: cat["household-admin"]!, name: "Polar AC Engineers",
      tagline: "2am blowout? We answer.", bio: "Emergency-first AC team covering all of Dubai around the clock. Certified engineers, sealed-spare vans, and a fix-on-first-visit rate above 90%.", rating: 4.8, reviewCount: 402, jobsCompleted: 6230, yearsOnPlatform: 6, verified: true, availableNow: true, responseMinutes: 8, startingPrice: 149, badges: ["24/7 Emergency", "Fix First Visit", "Certified Engineers"],
    },
    // Personal Wellbeing
    {
      categoryId: cat["personal-wellbeing"]!, name: "Glow Mobile Beauty",
      tagline: "Your salon, your sofa", bio: "Licensed stylists and nail artists who bring the full salon kit to your living room. Loved for event prep and school-morning saves.", rating: 4.9, reviewCount: 356, jobsCompleted: 5210, yearsOnPlatform: 5, verified: true, availableNow: true, responseMinutes: 18, startingPrice: 120, badges: ["Top Rated", "Licensed Stylists"],
    },
    {
      categoryId: cat["personal-wellbeing"]!, name: "Nightingale Home Care",
      tagline: "Clinical care with a gentle manner", bio: "DHA-licensed nurses and IV therapists for home visits: elder care, post-op support, physio and IV therapy. The team families ask for by name.", rating: 5.0, reviewCount: 240, jobsCompleted: 3320, yearsOnPlatform: 6, verified: true, availableNow: true, responseMinutes: 20, startingPrice: 350, badges: ["DHA Licensed", "Top Rated", "Elder Care Specialists"],
    },
    // Fitness & Recovery
    {
      categoryId: cat["fitness-recovery"]!, name: "DocOnCall Physio",
      tagline: "Recover where you rest", bio: "Sports and rehab physiotherapists for home sessions. Programmes built around your actual living room, not a clinic.", rating: 4.8, reviewCount: 152, jobsCompleted: 1980, yearsOnPlatform: 3, verified: true, availableNow: false, responseMinutes: 50, startingPrice: 250, badges: ["DHA Licensed"],
    },
    {
      categoryId: cat["fitness-recovery"]!, name: "FlexCoach UAE",
      tagline: "Personal training that fits your schedule", bio: "Certified trainers specialising in home and outdoor sessions. From fat-loss programmes to injury-recovery conditioning.", rating: 4.7, reviewCount: 118, jobsCompleted: 940, yearsOnPlatform: 2, verified: true, availableNow: true, responseMinutes: 30, startingPrice: 150, badges: ["Certified Trainers"],
    },
    // Mobility & Convenience
    {
      categoryId: cat["mobility-convenience"]!, name: "TaskDash UAE",
      tagline: "Your errands, handled", bio: "Insured runners for grocery collection, pharmacy trips, document drops, car parks and anything in between. Tracked delivery every time.", rating: 4.7, reviewCount: 194, jobsCompleted: 3810, yearsOnPlatform: 3, verified: true, availableNow: true, responseMinutes: 15, startingPrice: 49, badges: ["Tracked Delivery", "Insured"],
    },
    // Family & Dependent Support
    {
      categoryId: cat["family-support"]!, name: "SafeHands Care",
      tagline: "Trusted care for the ones you love most", bio: "DBS-checked childcare specialists and care companions. Babysitting, school runs and elder companionship — all vetted and first-aid certified.", rating: 4.9, reviewCount: 203, jobsCompleted: 2140, yearsOnPlatform: 4, verified: true, availableNow: false, responseMinutes: 40, startingPrice: 99, badges: ["DBS Checked", "First-Aid Certified"],
    },
    // Personal Development
    {
      categoryId: cat["personal-development"]!, name: "BrightMinds Academy",
      tagline: "Expert tutors and coaches, on demand", bio: "Qualified teachers and certified coaches for private tutoring, language learning and professional mentoring in Dubai and Abu Dhabi.", rating: 4.8, reviewCount: 167, jobsCompleted: 1560, yearsOnPlatform: 3, verified: true, availableNow: true, responseMinutes: 25, startingPrice: 120, badges: ["Qualified Educators"],
    },
    // Recreation & Lifestyle
    {
      categoryId: cat["recreation-lifestyle"]!, name: "TableCraft Kitchen",
      tagline: "Culinary experiences at home", bio: "Professional chefs and food educators who bring restaurant-grade cooking classes to your kitchen. Ideal for team events and family nights.", rating: 4.8, reviewCount: 89, jobsCompleted: 540, yearsOnPlatform: 2, verified: true, availableNow: true, responseMinutes: 60, startingPrice: 175, badges: ["Professional Chefs"],
    },
  ]).returning();
  const prov = Object.fromEntries(providerRows.map((p) => [p.name, p.id]));

  const serviceRows = await db.insert(servicesTable).values([
    // Marina Shine Cleaning (household-admin)
    { providerId: prov["Marina Shine Cleaning"]!, name: "Full Home Clean",             description: "Full-villa deep clean: kitchens degreased, bathrooms descaled, floors machine-polished.",              price: 399, durationMinutes: 240 },
    { providerId: prov["Marina Shine Cleaning"]!, name: "Express Apartment Clean",     description: "Recurring 2-hour clean for apartments up to 2 bedrooms — same crew every time.",                        price: 179, durationMinutes: 120 },
    // PressGo Laundry (household-admin)
    { providerId: prov["PressGo Laundry"]!, name: "Wash & Press — 2 Bags",             description: "Two bags collected, washed, pressed and delivered in 24h.",                                              price: 85,  durationMinutes: 30  },
    { providerId: prov["PressGo Laundry"]!, name: "Kandura & Abaya Care (5 pieces)",   description: "Hand-finished pressing for traditional wear.",                                                            price: 95,  durationMinutes: 30  },
    // Polar AC Engineers (household-admin)
    { providerId: prov["Polar AC Engineers"]!, name: "Emergency AC Repair",             description: "Round-the-clock callout: diagnose and fix leaks, failures and warm-air blowouts.",                       price: 249, durationMinutes: 90  },
    { providerId: prov["Polar AC Engineers"]!, name: "Annual AC Service (per unit)",    description: "Coil clean, filter wash, gas-pressure check and thermostat calibration.",                                price: 149, durationMinutes: 60  },
    // Glow Mobile Beauty (personal-wellbeing)
    { providerId: prov["Glow Mobile Beauty"]!, name: "Blow-Dry & Style",               description: "Wash-free blow-dry and styling at home.",                                                                 price: 120, durationMinutes: 45  },
    { providerId: prov["Glow Mobile Beauty"]!, name: "Gel Manicure & Pedicure",        description: "Full gel mani-pedi with salon kit.",                                                                      price: 240, durationMinutes: 90  },
    // Nightingale Home Care (personal-wellbeing)
    { providerId: prov["Nightingale Home Care"]!, name: "Nurse Home Visit",             description: "DHA-licensed nurse for wound care, injections, vitals and post-op checks.",                              price: 350, durationMinutes: 60  },
    { providerId: prov["Nightingale Home Care"]!, name: "IV Drip Therapy",             description: "Hydration and vitamin drips administered by licensed nurses.",                                            price: 499, durationMinutes: 60  },
    // DocOnCall Physio (fitness-recovery)
    { providerId: prov["DocOnCall Physio"]!, name: "Home Physio Session",              description: "One-hour physiotherapy session tailored to mobility goals.",                                              price: 320, durationMinutes: 60  },
    { providerId: prov["DocOnCall Physio"]!, name: "Sports Rehab Session",             description: "Assessment and rehab programme for injuries.",                                                            price: 250, durationMinutes: 60  },
    // FlexCoach UAE (fitness-recovery)
    { providerId: prov["FlexCoach UAE"]!, name: "Personal Training (60 min)",          description: "One-to-one session tailored to your fitness goals.",                                                      price: 200, durationMinutes: 60  },
    { providerId: prov["FlexCoach UAE"]!, name: "Yoga & Stretch Session",              description: "60-minute guided yoga and flexibility session at home or outdoors.",                                       price: 150, durationMinutes: 60  },
    // TaskDash UAE (mobility-convenience)
    { providerId: prov["TaskDash UAE"]!, name: "Grocery Run & Delivery",               description: "Runner collects your list from any supermarket and delivers to your door.",                               price: 49,  durationMinutes: 90  },
    { providerId: prov["TaskDash UAE"]!, name: "Errand & Admin Run",                   description: "Document drops, pharmacy, car parks, couriers — any single errand.",                                     price: 79,  durationMinutes: 60  },
    // SafeHands Care (family-support)
    { providerId: prov["SafeHands Care"]!, name: "Babysitting (half day)",             description: "DBS-checked sitter for up to 4 hours, day or evening.",                                                  price: 99,  durationMinutes: 240 },
    { providerId: prov["SafeHands Care"]!, name: "School Pickup & Care (3h)",          description: "Collect from school, safe handover at home, supervised activity.",                                        price: 120, durationMinutes: 180 },
    // BrightMinds Academy (personal-development)
    { providerId: prov["BrightMinds Academy"]!, name: "Private Tutoring Session (1h)", description: "One-to-one academic tutoring with a qualified teacher.",                                                  price: 150, durationMinutes: 60  },
    { providerId: prov["BrightMinds Academy"]!, name: "Language Coaching (1h)",        description: "Conversational coaching in Arabic, English, French or Mandarin.",                                         price: 120, durationMinutes: 60  },
    // TableCraft Kitchen (recreation-lifestyle)
    { providerId: prov["TableCraft Kitchen"]!, name: "Private Cooking Class (2h)",     description: "Hands-on class with a professional chef — Mediterranean, Asian or Emirati cuisine.",                     price: 199, durationMinutes: 120 },
    { providerId: prov["TableCraft Kitchen"]!, name: "Food Photography Workshop",      description: "Smartphone and DSLR food-styling session with a professional food photographer.",                         price: 175, durationMinutes: 120 },
  ]).returning();
  const svc = Object.fromEntries(serviceRows.map((s) => [s.name, s]));

  // ─── Bookings ─────────────────────────────────────────────────────────────

  console.log("Seeding bookings...");
  const mkBooking = async (v: {
    service: string;
    member: number;
    address: number;
    scheduledAt: Date;
    status: string;
    eta?: number | null;
    instructions?: string | null;
    createdAt: Date;
    events: Array<{ status: string; note: string; at: Date }>;
  }) => {
    const service = svc[v.service]!;
    const [b] = await db.insert(bookingsTable).values({
      householdId: hid,
      providerId: service.providerId,
      serviceId: service.id,
      memberId: v.member,
      addressId: v.address,
      scheduledAt: v.scheduledAt,
      status: v.status,
      priceEstimate: service.price,
      instructions: v.instructions ?? null,
      etaMinutes: v.eta ?? null,
      createdAt: v.createdAt,
    }).returning();
    if (v.events.length > 0) {
      await db.insert(bookingEventsTable).values(v.events.map((e) => ({
        bookingId: b!.id, status: e.status, note: e.note, occurredAt: e.at,
      })));
    }
    return b!;
  };

  const completedEvents = (created: Date, done: Date, provider: string, price: number) => [
    { status: "pending",   note: "Booking placed — waiting for the provider to accept",     at: created },
    { status: "confirmed", note: `${provider} accepted the job`,                              at: new Date(created.getTime() + 5 * 60_000) },
    { status: "completed", note: `Job completed — AED ${price} added to the household bill`, at: done },
  ];

  // Live: AC emergency en route
  const acBooking = await mkBooking({
    service: "Emergency AC Repair",
    member: omar.id, address: villa.id,
    scheduledAt: inMins(20), status: "en_route", eta: 18,
    instructions: "Master bedroom AC is leaking water through the vent — bucket underneath for now.",
    createdAt: minsAgo(45),
    events: [
      { status: "pending",   note: "Booking placed — waiting for the provider to accept", at: minsAgo(45) },
      { status: "confirmed", note: "Polar AC Engineers accepted the job",                  at: minsAgo(41) },
      { status: "en_route",  note: "Polar AC Engineers is on the way to The Villa",        at: minsAgo(12) },
    ],
  });

  // Live: physio session in progress
  const physioBooking = await mkBooking({
    service: "Home Physio Session",
    member: layla.id, address: villa.id,
    scheduledAt: hoursAgo(1), status: "in_progress",
    instructions: "Physio for Teta Farida — gentle knee mobility work, she gets nervous.",
    createdAt: daysAgo(1),
    events: [
      { status: "pending",     note: "Booking placed — waiting for the provider to accept", at: daysAgo(1) },
      { status: "confirmed",   note: "DocOnCall Physio accepted the job",                   at: new Date(daysAgo(1).getTime() + 6 * 60_000) },
      { status: "en_route",    note: "DocOnCall Physio is on the way to The Villa",          at: minsAgo(100) },
      { status: "arrived",     note: "Provider arrived at The Villa",                         at: minsAgo(70) },
      { status: "in_progress", note: "Work has started",                                      at: minsAgo(60) },
    ],
  });

  // Upcoming — confirmed
  await mkBooking({
    service: "Full Home Clean",
    member: layla.id, address: villa.id,
    scheduledAt: at(1, 10, 0), status: "confirmed",
    instructions: "Focus on the kitchen and the majlis — guests on Friday.",
    createdAt: daysAgo(1),
    events: [
      { status: "pending",   note: "Booking placed — waiting for the provider to accept", at: daysAgo(1) },
      { status: "confirmed", note: "Marina Shine Cleaning accepted the job",               at: new Date(daysAgo(1).getTime() + 9 * 60_000) },
    ],
  });

  // Upcoming — pending approval
  await mkBooking({
    service: "Blow-Dry & Style",
    member: amira.id, address: villa.id,
    scheduledAt: at(3, 16, 0), status: "pending",
    instructions: null, createdAt: hoursAgo(2),
    events: [{ status: "pending", note: "Booking placed — waiting for the provider to accept", at: hoursAgo(2) }],
  });

  // Upcoming — grocery run for Rosa
  await mkBooking({
    service: "Grocery Run & Delivery",
    member: rosa.id, address: villa.id,
    scheduledAt: at(0, 16, 30), status: "confirmed",
    instructions: "Pick up from Carrefour Market — list pinned in the app.",
    createdAt: hoursAgo(3),
    events: [
      { status: "pending",   note: "Booking placed — waiting for the provider to accept", at: hoursAgo(3) },
      { status: "confirmed", note: "TaskDash UAE accepted the job",                         at: new Date(hoursAgo(3).getTime() + 8 * 60_000) },
    ],
  });

  // Completed this month
  const laundryDone = await mkBooking({
    service: "Wash & Press — 2 Bags",
    member: rosa.id, address: villa.id,
    scheduledAt: daysAgo(1), status: "completed",
    createdAt: daysAgo(2),
    events: completedEvents(daysAgo(2), daysAgo(1), "PressGo Laundry", 85),
  });
  const blowDryDone = await mkBooking({
    service: "Blow-Dry & Style",
    member: amira.id, address: villa.id,
    scheduledAt: new Date(daysAgo(1).getTime() - 4 * 60 * 60_000),
    status: "completed",
    instructions: "Blowout before her school presentation.",
    createdAt: daysAgo(3),
    events: completedEvents(daysAgo(3), new Date(daysAgo(1).getTime() - 2 * 60 * 60_000), "Glow Mobile Beauty", 120),
  });

  // Completed last month
  const julyClean = await mkBooking({
    service: "Full Home Clean",
    member: layla.id, address: villa.id,
    scheduledAt: daysAgo(25), status: "completed",
    createdAt: daysAgo(26),
    events: completedEvents(daysAgo(26), daysAgo(25), "Marina Shine Cleaning", 399),
  });
  const julyIV = await mkBooking({
    service: "IV Drip Therapy",
    member: omar.id, address: villa.id,
    scheduledAt: daysAgo(20), status: "completed",
    instructions: "Vitamin C and hydration — post-travel fatigue.",
    createdAt: daysAgo(22),
    events: completedEvents(daysAgo(22), daysAgo(20), "Nightingale Home Care", 499),
  });
  const julyPhysio = await mkBooking({
    service: "Home Physio Session",
    member: layla.id, address: villa.id,
    scheduledAt: daysAgo(15), status: "completed",
    createdAt: daysAgo(16),
    events: completedEvents(daysAgo(16), daysAgo(15), "DocOnCall Physio", 320),
  });
  const julyTutoring = await mkBooking({
    service: "Private Tutoring Session (1h)",
    member: zayd.id, address: villa.id,
    scheduledAt: daysAgo(10), status: "completed",
    instructions: "IGCSE Maths revision — Paper 2.",
    createdAt: daysAgo(11),
    events: completedEvents(daysAgo(11), daysAgo(10), "BrightMinds Academy", 150),
  });

  // Cancelled
  const babysittingCancelled = await mkBooking({
    service: "Babysitting (half day)",
    member: amira.id, address: villa.id,
    scheduledAt: daysAgo(5), status: "cancelled",
    createdAt: daysAgo(7),
    events: [
      { status: "pending",   note: "Booking placed — waiting for the provider to accept", at: daysAgo(7) },
      { status: "confirmed", note: "SafeHands Care accepted the job",                      at: new Date(daysAgo(7).getTime() + 60 * 60_000) },
      { status: "cancelled", note: "Booking cancelled by the household",                   at: daysAgo(6) },
    ],
  });

  // ─── Chat messages ────────────────────────────────────────────────────────

  console.log("Seeding chat messages...");
  await db.insert(messagesTable).values([
    { bookingId: acBooking.id, sender: "member",   senderName: "Omar Mansour",   body: "The AC in the master bedroom is dripping through the vent — I've put a bucket under it.",       sentAt: minsAgo(38) },
    { bookingId: acBooking.id, sender: "provider", senderName: "Polar AC Engineers", body: "Thanks for the details. Sounds like a blocked drain line — I'll bring the vacuum pump.",    sentAt: minsAgo(35) },
    { bookingId: acBooking.id, sender: "member",   senderName: "Omar Mansour",   body: "Gate code is 4412, use the side entrance please.",                                               sentAt: minsAgo(30) },
    { bookingId: acBooking.id, sender: "provider", senderName: "Polar AC Engineers", body: "Perfect. On my way now — traffic on SZR is light, see you in about 15 minutes.",            sentAt: minsAgo(12) },
    { bookingId: physioBooking.id, sender: "provider", senderName: "DocOnCall Physio",  body: "Session started — we're warming up gently, she's doing well.",                           sentAt: minsAgo(55) },
    { bookingId: physioBooking.id, sender: "member",   senderName: "Layla Mansour", body: "Thank you — she was nervous this morning, glad it's going smoothly.",                        sentAt: minsAgo(50) },
  ]);

  // ─── Pack thread ──────────────────────────────────────────────────────────

  console.log("Seeding pack thread...");
  await db.insert(packMessagesTable).values([
    { householdId: hid, memberId: rosa.id,  body: "Laundry pickup done, everything back Thursday.", sentAt: hoursAgo(2) },
    { householdId: hid, memberId: zayd.id,  body: "Can someone approve my AC request before tonight? It's boiling in my room 🥵", sentAt: minsAgo(95) },
    { householdId: hid, memberId: layla.id, body: "Physio's here — settling Teta in now, she's calm.", sentAt: minsAgo(55) },
    { householdId: hid, memberId: amira.id, body: "Also I put in a request for Saturday hair, pretty please 🙏", sentAt: minsAgo(40) },
    { householdId: hid, memberId: omar.id,  body: "Grocery runner confirmed for 4:30 — Rosa's list is covered.", sentAt: minsAgo(15) },
  ]);
  await db.update(membersTable).set({ packLastReadAt: minsAgo(90) }).where(eq(membersTable.id, omar.id));

  await db.insert(serviceRequestsTable).values([
    { householdId: hid, memberId: zayd.id,  serviceId: svc["Annual AC Service (per unit)"]!.id, note: "My room's AC is barely cooling", status: "pending", createdAt: minsAgo(100) },
    { householdId: hid, memberId: amira.id, serviceId: svc["Blow-Dry & Style"]!.id,              note: "Saturday morning?",              status: "pending", createdAt: minsAgo(45) },
  ]);

  // ─── Billing ──────────────────────────────────────────────────────────────

  console.log("Seeding billing...");
  const augustLabel = monthLabel(now);
  const july = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const june = new Date(now.getFullYear(), now.getMonth() - 2, 15);
  const may  = new Date(now.getFullYear(), now.getMonth() - 3, 15);
  const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 21, 14, 0);

  await db.insert(statementsTable).values({ householdId: hid, monthLabel: monthLabel(may),  status: "paid", total: 1840, itemCount: 7, paidAt: endOfMonth(may),  paidWith: "Visa •••• 4421", createdAt: new Date(may.getFullYear(),  may.getMonth(),  1) });
  await db.insert(statementsTable).values({ householdId: hid, monthLabel: monthLabel(june), status: "paid", total: 1490, itemCount: 6, paidAt: endOfMonth(june), paidWith: "Loup Wallet",   createdAt: new Date(june.getFullYear(), june.getMonth(), 1) });
  const [julyStmt]   = await db.insert(statementsTable).values({ householdId: hid, monthLabel: monthLabel(july), status: "paid", total: 1368, itemCount: 4, paidAt: endOfMonth(july), paidWith: "Visa •••• 4421", createdAt: new Date(july.getFullYear(), july.getMonth(), 1) }).returning();
  const [augustStmt] = await db.insert(statementsTable).values({ householdId: hid, monthLabel: augustLabel, status: "open", total: 205, itemCount: 2, createdAt: new Date(now.getFullYear(), now.getMonth(), 1) }).returning();

  await db.insert(billItemsTable).values([
    { statementId: julyStmt!.id,   bookingId: julyClean.id,    amount: 399, date: daysAgo(25) },
    { statementId: julyStmt!.id,   bookingId: julyIV.id,       amount: 499, date: daysAgo(20) },
    { statementId: julyStmt!.id,   bookingId: julyPhysio.id,   amount: 320, date: daysAgo(15) },
    { statementId: julyStmt!.id,   bookingId: julyTutoring.id, amount: 150, date: daysAgo(10) },
    { statementId: augustStmt!.id, bookingId: laundryDone.id,  amount: 85,  date: daysAgo(1) },
    { statementId: augustStmt!.id, bookingId: blowDryDone.id,  amount: 120, date: new Date(daysAgo(1).getTime() - 2 * 60 * 60_000) },
  ]);

  await db.insert(paymentMethodsTable).values([
    { householdId: hid, type: "card",   label: "Visa •••• 4421",   detail: "Omar Mansour — expires 09/28",     isDefault: true  },
    { householdId: hid, type: "wallet", label: "Loup Wallet",       detail: "Balance: AED 1,250",               isDefault: false },
    { householdId: hid, type: "cash",   label: "Cash on completion", detail: "Pay the provider directly when the job is done", isDefault: false },
  ]);

  // ─── Reviews ─────────────────────────────────────────────────────────────

  console.log("Seeding reviews...");
  await db.insert(reviewsTable).values([
    { providerId: prov["Marina Shine Cleaning"]!, bookingId: julyClean.id, authorName: "Layla Mansour",   rating: 5, comment: "The villa has never looked this good. Same crew as always — they know exactly how we like the majlis done.", createdAt: daysAgo(24) },
    { providerId: prov["Marina Shine Cleaning"]!, bookingId: null, authorName: "Fatima K.", rating: 5, comment: "Booked the deep clean before Eid — worth every dirham.", createdAt: daysAgo(40) },
    { providerId: prov["Nightingale Home Care"]!, bookingId: julyIV.id,    authorName: "Omar Mansour",    rating: 5, comment: "Arrived in 25 minutes, professional from start to finish. The IV made a real difference after a long week.", createdAt: daysAgo(19) },
    { providerId: prov["Nightingale Home Care"]!, bookingId: null, authorName: "Omar D.", rating: 5, comment: "Post-surgery care at home, handled perfectly. The nurse explained everything.", createdAt: daysAgo(70) },
    { providerId: prov["DocOnCall Physio"]!, bookingId: julyPhysio.id, authorName: "Layla Mansour", rating: 5, comment: "Gentle, patient and completely professional with my mother. We only book DocOnCall now.", createdAt: daysAgo(14) },
    { providerId: prov["Glow Mobile Beauty"]!, bookingId: blowDryDone.id, authorName: "Amira Mansour", rating: 5, comment: "Perfect blow-dry before the presentation — she loved it.", createdAt: new Date(daysAgo(1).getTime() + 60 * 60_000) },
    { providerId: prov["BrightMinds Academy"]!, bookingId: julyTutoring.id, authorName: "Zayd Mansour", rating: 5, comment: "Really clear explanations, finally understood the quadratic stuff.", createdAt: daysAgo(9) },
    { providerId: prov["PressGo Laundry"]!, bookingId: null, authorName: "Khalid N.", rating: 5, comment: "Kanduras come back crisp every single time. 24h promise is real.", createdAt: daysAgo(35) },
    { providerId: prov["Polar AC Engineers"]!, bookingId: null, authorName: "Mohammed B.", rating: 4, comment: "Quick response, tidy work. Will book again for the annual service.", createdAt: daysAgo(90) },
  ]);

  // ─── Meridian employees ───────────────────────────────────────────────────

  console.log("Seeding Meridian employees...");

  await db.insert(benefitProgramsTable).values({
    employerId: employer!.id,
    name: "Meridian Staff Lifestyle Benefits (Legacy Link)",
    period: "monthly",
    allowanceAmount: 750,
    renewalDate: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10),
    expirationPolicy: "Unused allowance expires at period end",
    householdAccess: true,
    maxHouseholdMembers: 3,
    maxHouseholdAllocationPct: 50,
    active: true,
  });

  const today = now.toISOString().slice(0, 10);

  const namedEmployees = [
    { externalEmployeeId: "MEG-0001", name: "Omar Mansour",          workEmail: "o.mansour@meridian.edu",    department: "Academic",           benefitTier: "Faculty",        tierId: facultyTier!.id, campusId: dhCampus!.id, institutionId: institution!.id, householdEligible: true,  linkedMemberId: omar.id  },
    { externalEmployeeId: "MEG-0002", name: "Layla Mansour",         workEmail: "l.mansour@meridian.edu",    department: "Academic",           benefitTier: "Faculty",        tierId: facultyTier!.id, campusId: dhCampus!.id, institutionId: institution!.id, householdEligible: true,  linkedMemberId: layla.id },
    { externalEmployeeId: "MEG-0003", name: "Dr. Sarah Al-Hassan",   workEmail: "s.al-hassan@meridian.edu",  department: "Academic",           benefitTier: "Faculty",        tierId: facultyTier!.id, campusId: dhCampus!.id, institutionId: institution!.id, householdEligible: true,  linkedMemberId: null     },
    { externalEmployeeId: "MEG-0004", name: "James Thornton",        workEmail: "j.thornton@meridian.edu",   department: "Academic",           benefitTier: "Faculty",        tierId: facultyTier!.id, campusId: aqCampus!.id, institutionId: institution!.id, householdEligible: true,  linkedMemberId: null     },
    { externalEmployeeId: "MEG-0005", name: "Mohammed Al-Rashid",    workEmail: "m.al-rashid@meridian.edu",  department: "Academic",           benefitTier: "Faculty",        tierId: facultyTier!.id, campusId: aqCampus!.id, institutionId: institution!.id, householdEligible: true,  linkedMemberId: null     },
    { externalEmployeeId: "MEG-0006", name: "Rania Khalil",          workEmail: "r.khalil@meridian.edu",     department: "HR & Administration","benefitTier": "Staff",        tierId: staffTier!.id,   campusId: dhCampus!.id, institutionId: institution!.id, householdEligible: true,  linkedMemberId: null     },
    { externalEmployeeId: "MEG-0007", name: "Tom Mackenzie",         workEmail: "t.mackenzie@meridian.edu",  department: "IT & Operations",    "benefitTier": "Staff",        tierId: staffTier!.id,   campusId: dhCampus!.id, institutionId: institution!.id, householdEligible: false, linkedMemberId: null     },
    { externalEmployeeId: "MEG-0008", name: "Priya Nair",            workEmail: "p.nair@meridian.edu",       department: "Finance",            "benefitTier": "Staff",        tierId: staffTier!.id,   campusId: aqCampus!.id, institutionId: institution!.id, householdEligible: true,  linkedMemberId: null     },
    { externalEmployeeId: "MEG-0009", name: "Aisha Bakr",            workEmail: "a.bakr@meridian.edu",       department: "Student Services",   "benefitTier": "Administrative",tierId: adminTier!.id,  campusId: aqCampus!.id, institutionId: institution!.id, householdEligible: false, linkedMemberId: null     },
    { externalEmployeeId: "MEG-0010", name: "Carlos Mendez",         workEmail: "c.mendez@meridian.edu",     department: "Facilities",         "benefitTier": "Administrative",tierId: adminTier!.id,  campusId: dhCampus!.id, institutionId: institution!.id, householdEligible: false, linkedMemberId: null     },
  ];

  const depts = ["Academic", "HR & Administration", "IT & Operations", "Student Services", "Finance", "Facilities"];
  const rosterEmployees = Array.from({ length: 50 }, (_, i) => {
    const idx = i + 11;
    const tierIdx = i % 10 < 4 ? 0 : i % 10 < 8 ? 1 : 2; // 40% Faculty, 40% Staff, 20% Admin
    const [tier, tierId] = [["Faculty", facultyTier!.id], ["Staff", staffTier!.id], ["Administrative", adminTier!.id]][tierIdx]!;
    return {
      externalEmployeeId: `MEG-${String(idx).padStart(4, "0")}`,
      name: `Meridian colleague ${String(idx).padStart(3, "0")}`,
      workEmail: `colleague${idx}@meridian.edu`,
      department: depts[idx % depts.length]!,
      benefitTier: tier as string,
      tierId: tierId as number,
      campusId: idx % 2 === 0 ? dhCampus!.id : aqCampus!.id,
      institutionId: institution!.id,
      householdEligible: idx % 4 !== 0,
      linkedMemberId: null,
    };
  });

  const seededEmployees = await db.insert(employeesTable).values(
    [...namedEmployees, ...rosterEmployees].map((e) => ({
      employerId: employer!.id,
      externalEmployeeId: e.externalEmployeeId,
      name: e.name,
      workEmail: e.workEmail,
      department: e.department,
      benefitTier: e.benefitTier,
      eligibilityStatus: "eligible",
      householdEligible: e.householdEligible,
      linkedMemberId: e.linkedMemberId,
      institutionId: e.institutionId,
      campusId: e.campusId,
      tierId: e.tierId,
      startDate: today,
    })),
  ).returning();

  const omarEmployee = seededEmployees.find((e) => e.externalEmployeeId === "MEG-0001")!;

  // ─── Allowance ledger ─────────────────────────────────────────────────────

  await db.insert(allowanceLedgerTable).values([
    {
      employerId:   employer!.id,
      employeeId:   omarEmployee.id,
      entryType:    "authorized",
      amount:       750,
      referenceType: "benefit_tier",
      note:         "Monthly Faculty tier allowance — Meridian Education Group",
      institutionId: institution!.id,
      benefitPlanId: plan!.id,
      benefitTierId: facultyTier!.id,
      idempotencyKey: `auth-${omarEmployee.id}-${now.getFullYear()}-${now.getMonth() + 1}`,
      createdByRole:  "system",
    },
    {
      employerId:   employer!.id,
      employeeId:   omarEmployee.id,
      entryType:    "reserved",
      amount:       249,
      referenceType: "booking",
      referenceId:  acBooking.id,
      note:         "Reserved for an eligible home-admin booking",
      institutionId: institution!.id,
      benefitPlanId: plan!.id,
      benefitTierId: facultyTier!.id,
      idempotencyKey: `reserve-${omarEmployee.id}-${acBooking.id}`,
      createdByRole:  "employee",
    },
    {
      employerId:   employer!.id,
      employeeId:   omarEmployee.id,
      entryType:    "redeemed",
      amount:       85,
      referenceType: "booking",
      referenceId:  laundryDone.id,
      note:         "Redeemed after laundry service completion",
      institutionId: institution!.id,
      benefitPlanId: plan!.id,
      benefitTierId: facultyTier!.id,
      idempotencyKey: `redeem-${omarEmployee.id}-${laundryDone.id}`,
      createdByRole:  "system",
    },
  ]);

  // ─── Routines ─────────────────────────────────────────────────────────────

  await db.insert(routinesTable).values([
    {
      memberId: omar.id, categorySlug: "household-admin", label: "Weekly home care",
      frequency: "Weekly", preferredDay: "Saturday", preferredTime: "10:00",
      maxCopayment: 75, automaticReminder: true, manualConfirmation: true, status: "active",
    },
    {
      memberId: omar.id, categorySlug: "fitness-recovery", label: "Monthly physio session",
      frequency: "Monthly", preferredDay: "First Friday", preferredTime: "09:00",
      maxCopayment: 100, automaticReminder: true, manualConfirmation: true, status: "active",
    },
  ]);

  // ─── Audit events ─────────────────────────────────────────────────────────

  await db.insert(auditEventsTable).values([
    {
      actorRole: "admin", actorId: "ops-demo",
      action: "matching.override", entityType: "booking", entityId: String(acBooking.id),
      metadata: { reason: "Coverage continuity for the household" },
    },
    {
      actorRole: "institution", actorId: "meridian-admin",
      action: "benefit_plan.updated", entityType: "benefit_plan", entityId: String(plan!.id),
      metadata: { field: "householdAccess", value: true },
    },
    {
      actorRole: "employee", actorId: "omar-demo",
      action: "allowance.reserved", entityType: "ledger", entityId: String(omarEmployee.id),
      metadata: { amount: 249, category: "household-admin" },
    },
  ]);

  // ─── Booking status history ───────────────────────────────────────────────

  await db.insert(bookingStatusHistoryTable).values([
    { bookingId: acBooking.id, fromStatus: null,        toStatus: "pending",   actorRole: "employee", note: "Booking created" },
    { bookingId: acBooking.id, fromStatus: "pending",   toStatus: "confirmed", actorRole: "provider", note: "Provider accepted" },
    { bookingId: acBooking.id, fromStatus: "confirmed", toStatus: "en_route",  actorRole: "provider", note: "Provider en route" },
  ]);

  // ─── Support incident (demo: one resolved, one open) ─────────────────────

  await db.insert(supportIncidentsTable).values([
    {
      bookingId: julyIV.id, employeeId: omarEmployee.id,
      category: "quality", description: "Provider arrived 20 minutes late to the IV drip appointment.",
      status: "resolved", resolution: "Provider reminded of punctuality requirement. 10% credit issued.",
      resolvedAt: daysAgo(18),
    },
    {
      bookingId: acBooking.id, employeeId: omarEmployee.id,
      category: "general", description: "Customer queried whether the AC drain pump repair is covered under the benefit.",
      status: "open", resolution: null,
    },
  ]);

  // ─── Provider quality flag ────────────────────────────────────────────────

  await db.insert(providerQualityFlagsTable).values([
    {
      providerId: prov["Nightingale Home Care"]!,
      flagType: "low_rating",
      threshold: 4.5,
      currentValue: 4.3,
      status: "resolved",
      reviewedAt: daysAgo(10),
    },
  ]);

  // ─── Webhook events (P0-3) ────────────────────────────────────────────────
  // A full transaction lifecycle for the admin "Webhook Events" log: activation,
  // allowance issuance, booking created → accepted → completed, cancellation,
  // payment, a refund, and one failed delivery to exercise the retry story.

  await db.insert(webhookEventsTable).values([
    {
      eventType: "employee.activated",
      payload: { employeeId: omarEmployee.id, externalEmployeeId: "MEG-0001", name: "Omar Mansour", employerId: employer!.id },
      deliveredAt: daysAgo(40),
      createdAt: daysAgo(40),
      status: "delivered",
    },
    {
      eventType: "allowance.issued",
      payload: { employeeId: omarEmployee.id, amount: 750, tier: "Faculty", employerId: employer!.id },
      deliveredAt: daysAgo(40),
      createdAt: daysAgo(40),
      status: "delivered",
    },
    {
      eventType: "allowance.issued",
      payload: { employeeId: omarEmployee.id, amount: 750, tier: "Faculty", employerId: employer!.id },
      deliveredAt: daysAgo(10),
      createdAt: daysAgo(10),
      status: "delivered",
    },
    {
      eventType: "booking.created",
      payload: { bookingId: blowDryDone.id, serviceName: "Blow-Dry & Style", amount: 120, providerId: blowDryDone.providerId },
      deliveredAt: daysAgo(3),
      createdAt: daysAgo(3),
      status: "delivered",
    },
    {
      eventType: "booking.accepted",
      payload: { bookingId: blowDryDone.id, providerId: blowDryDone.providerId, providerName: "Glow Mobile Beauty" },
      deliveredAt: new Date(daysAgo(3).getTime() + 8 * 60_000),
      createdAt: new Date(daysAgo(3).getTime() + 8 * 60_000),
      status: "delivered",
    },
    {
      eventType: "booking.created",
      payload: { bookingId: laundryDone.id, serviceName: "Wash & Press — 2 Bags", amount: 85, providerId: laundryDone.providerId },
      deliveredAt: daysAgo(2),
      createdAt: daysAgo(2),
      status: "delivered",
    },
    {
      eventType: "booking.accepted",
      payload: { bookingId: laundryDone.id, providerId: laundryDone.providerId, providerName: "PressGo Laundry" },
      deliveredAt: new Date(daysAgo(2).getTime() + 6 * 60_000),
      createdAt: new Date(daysAgo(2).getTime() + 6 * 60_000),
      status: "delivered",
    },
    {
      eventType: "booking.completed",
      payload: { bookingId: blowDryDone.id, amount: 120, providerId: blowDryDone.providerId },
      deliveredAt: daysAgo(1),
      createdAt: daysAgo(1),
      status: "delivered",
    },
    {
      eventType: "booking.completed",
      payload: { bookingId: laundryDone.id, amount: 85, providerId: laundryDone.providerId },
      deliveredAt: daysAgo(1),
      createdAt: daysAgo(1),
      status: "delivered",
    },
    {
      eventType: "booking.completed",
      payload: { bookingId: julyPhysio.id, amount: 320, providerId: julyPhysio.providerId },
      deliveredAt: null,
      createdAt: daysAgo(15),
      status: "failed",
    },
    {
      eventType: "booking.cancelled",
      payload: { bookingId: babysittingCancelled.id, providerId: babysittingCancelled.providerId, reason: "Cancelled by the household" },
      deliveredAt: daysAgo(6),
      createdAt: daysAgo(6),
      status: "delivered",
    },
    {
      eventType: "payment.completed",
      payload: { statementId: julyStmt!.id, total: 1368, method: "Visa •••• 4421", monthLabel: monthLabel(july) },
      deliveredAt: endOfMonth(july),
      createdAt: endOfMonth(july),
      status: "delivered",
    },
    {
      eventType: "refund.processed",
      payload: { originalEntryId: 3, amount: 85, employerId: employer!.id, note: "Admin refund of laundry redemption" },
      deliveredAt: daysAgo(0.5),
      createdAt: daysAgo(0.5),
      status: "delivered",
    },
  ]);

  // ─── Provider availability (Marina Shine Cleaning) ────────────────────────

  const marinaId = prov["Marina Shine Cleaning"]!;
  // SUN=0, MON=1, TUE=2, WED=3, THU=4, FRI=5, SAT=6
  // Working days: Sun–Thu (standard UAE business week) + Saturday mornings
  await db.insert(providerAvailabilityTable).values([
    { providerId: marinaId, dayOfWeek: 0, startTime: "08:00", endTime: "18:00", zones: ["Jumeirah 3", "Downtown Dubai", "Dubai Hills"], maxCapacity: 8, active: true },
    { providerId: marinaId, dayOfWeek: 1, startTime: "08:00", endTime: "18:00", zones: ["Jumeirah 3", "Downtown Dubai", "Dubai Hills", "Al Qouz"], maxCapacity: 10, active: true },
    { providerId: marinaId, dayOfWeek: 2, startTime: "08:00", endTime: "18:00", zones: ["Jumeirah 3", "Downtown Dubai", "Dubai Hills", "Al Qouz"], maxCapacity: 10, active: true },
    { providerId: marinaId, dayOfWeek: 3, startTime: "08:00", endTime: "18:00", zones: ["Jumeirah 3", "Downtown Dubai", "Dubai Hills", "Al Qouz"], maxCapacity: 10, active: true },
    { providerId: marinaId, dayOfWeek: 4, startTime: "08:00", endTime: "16:00", zones: ["Jumeirah 3", "Dubai Hills"], maxCapacity: 6, active: true },
    { providerId: marinaId, dayOfWeek: 6, startTime: "09:00", endTime: "14:00", zones: ["Jumeirah 3", "Downtown Dubai"], maxCapacity: 4, active: true },
  ]);

  // ─── Al Noor University — second demo tenant ─────────────────────────────────
  // Proves multi-tenant isolation for the pitch: a separate group, institution,
  // campus, benefit plan and roster, resolved from the signed token claims.
  console.log("Seeding Al Noor University...");

  const [alNoorGroup] = await db.insert(educationGroupsTable).values({
    name: "Al Noor Education Group",
    slug: "al-noor-education-group",
    country: "AE",
    active: true,
  }).returning();

  const [alNoorInstitution] = await db.insert(institutionsTable).values({
    groupId: alNoorGroup!.id,
    name: "Al Noor University",
    slug: "al-noor-university",
    type: "university",
    country: "AE",
    city: "Dubai",
    active: true,
  }).returning();

  const [anCampus] = await db.insert(campusesTable).values({
    institutionId: alNoorInstitution!.id,
    name: "Al Noor Academic City",
    slug: "al-noor-academic-city",
    city: "Dubai",
    active: true,
  }).returning();

  await db.insert(departmentsTable).values([
    { campusId: anCampus!.id, name: "Academic",          slug: "academic-an"          },
    { campusId: anCampus!.id, name: "Administration",    slug: "administration-an"    },
    { campusId: anCampus!.id, name: "Student Affairs",   slug: "student-affairs-an"   },
  ]);

  const [anPlan] = await db.insert(benefitPlansTable).values({
    institutionId: alNoorInstitution!.id,
    name: "Al Noor Staff Benefits",
    period: "monthly",
    renewalFrequency: "monthly",
    expirationPolicy: "expires_at_period_end",
    rolloverEnabled: false,
    householdAccess: true,
    topUpPermitted: true,
    permittedCategoryIds: [],
    platformFeeRatePct: 8,
    perEmployeeMonthlyFee: 0,
    active: true,
  }).returning();

  const anTiers = await db.insert(benefitTiersTable).values([
    { planId: anPlan!.id, name: "Faculty", monthlyAllowance: 600, description: "Teaching and research staff", active: true },
    { planId: anPlan!.id, name: "Staff",   monthlyAllowance: 350, description: "Administrative and support staff", active: true },
  ]).returning();
  const [anFacultyTier, anStaffTier] = anTiers as [typeof anTiers[number], typeof anTiers[number]];

  const [anEmployer] = await db.insert(employersTable).values({
    name: "Al Noor University",
    slug: "al-noor",
    country: "AE",
    active: true,
  }).returning();

  const anNamedEmployees = [
    { externalEmployeeId: "ANU-0001", name: "Dr. Fatima Al-Amin",   workEmail: "f.alamin@alnoor.ac.ae",    department: "Academic",        benefitTier: "Faculty", tierId: anFacultyTier!.id, householdEligible: true  },
    { externalEmployeeId: "ANU-0002", name: "Dr. Karim Haddad",     workEmail: "k.haddad@alnoor.ac.ae",    department: "Academic",        benefitTier: "Faculty", tierId: anFacultyTier!.id, householdEligible: true  },
    { externalEmployeeId: "ANU-0003", name: "Noora Al Suwaidi",     workEmail: "n.alsuwaidi@alnoor.ac.ae", department: "Administration",  benefitTier: "Staff",   tierId: anStaffTier!.id,   householdEligible: true  },
    { externalEmployeeId: "ANU-0004", name: "David Okonkwo",        workEmail: "d.okonkwo@alnoor.ac.ae",   department: "Student Affairs", benefitTier: "Staff",   tierId: anStaffTier!.id,   householdEligible: false },
    { externalEmployeeId: "ANU-0005", name: "Hana Farouk",          workEmail: "h.farouk@alnoor.ac.ae",    department: "Administration",  benefitTier: "Staff",   tierId: anStaffTier!.id,   householdEligible: true  },
  ];

  const anRosterEmployees = Array.from({ length: 10 }, (_, i) => {
    const idx = i + 6;
    const [tier, tierId] = idx % 2 === 0
      ? ["Faculty" as string, anFacultyTier!.id as number]
      : ["Staff" as string, anStaffTier!.id as number];
    return {
      externalEmployeeId: `ANU-${String(idx).padStart(4, "0")}`,
      name: `Al Noor colleague ${String(idx).padStart(3, "0")}`,
      workEmail: `colleague${idx}@alnoor.ac.ae`,
      department: ["Academic", "Administration", "Student Affairs"][idx % 3]!,
      benefitTier: tier,
      tierId,
      householdEligible: idx % 3 !== 0,
    };
  });

  const anEmployees = await db.insert(employeesTable).values(
    [...anNamedEmployees, ...anRosterEmployees].map((e) => ({
      employerId: anEmployer!.id,
      externalEmployeeId: e.externalEmployeeId,
      name: e.name,
      workEmail: e.workEmail,
      department: e.department,
      benefitTier: e.benefitTier,
      eligibilityStatus: "eligible",
      householdEligible: e.householdEligible,
      linkedMemberId: null,
      institutionId: alNoorInstitution!.id,
      campusId: anCampus!.id,
      tierId: e.tierId,
      startDate: today,
    })),
  ).returning();

  // ─── Al Noor webhook events (P0-3) ───────────────────────────────────────
  // The second tenant's stream proves multi-tenant webhook delivery: the admin
  // log mixes events from every employer, each payload carrying its employerId.

  const anuLead = anEmployees.find((e) => e.externalEmployeeId === "ANU-0001")!;
  await db.insert(webhookEventsTable).values([
    {
      eventType: "employee.activated",
      payload: { employeeId: anuLead.id, externalEmployeeId: "ANU-0001", name: "Dr. Fatima Al-Amin", employerId: anEmployer!.id },
      deliveredAt: daysAgo(3),
      createdAt: daysAgo(3),
      status: "delivered",
    },
    {
      eventType: "allowance.issued",
      payload: { employeeId: anuLead.id, amount: 600, tier: "Faculty", employerId: anEmployer!.id },
      deliveredAt: daysAgo(3),
      createdAt: daysAgo(3),
      status: "delivered",
    },
    {
      eventType: "allowance.issued",
      payload: { employeeId: anuLead.id, amount: 600, tier: "Faculty", employerId: anEmployer!.id },
      deliveredAt: daysAgo(2),
      createdAt: daysAgo(2),
      status: "pending",
    },
  ]);

  console.log("Seed complete.");
  console.log(
    `Meridian: 1 group, 1 institution, 2 campuses, 3 tiers, ${seededEmployees.length} employees | ` +
    `Al Noor: 1 institution, 1 campus, 2 tiers, ${anEmployees.length} employees | ` +
    `Catalog: ${categories.length} categories, ${providerRows.length} providers, ${serviceRows.length} services`,
  );
}

main()
  .then(async () => { await closeDb(); process.exit(0); })
  .catch(async (err) => { console.error(err); await closeDb(); process.exit(1); });
