/**
 * Seed script for Loup — demo data for the Mansour household in Dubai.
 * Run with: pnpm --filter @workspace/scripts run seed
 * All dates are relative to "now" so the demo always looks alive.
 */
import { eq } from "drizzle-orm";
import {
  db,
  pool,
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
} from "@workspace/db";

const now = new Date();
const minsAgo = (m: number) => new Date(now.getTime() - m * 60_000);
const hoursAgo = (h: number) => minsAgo(h * 60);
const daysAgo = (d: number) => hoursAgo(d * 24);
const inMins = (m: number) => new Date(now.getTime() + m * 60_000);
const at = (daysFromNow: number, hour: number, minute = 0) => {
  const d = new Date(now.getTime() + daysFromNow * 24 * 60 * 60_000);
  d.setHours(hour, minute, 0, 0);
  return d;
};
const monthLabel = (d: Date) =>
  d.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "Asia/Dubai" });

async function main() {
  console.log("Clearing existing data...");
  await db.delete(auditEventsTable);
  await db.delete(allowanceLedgerTable);
  await db.delete(routinesTable);
  await db.delete(employeesTable);
  await db.delete(benefitProgramsTable);
  await db.delete(employersTable);
  await db.delete(packMessagesTable);
  await db.delete(serviceRequestsTable);
  await db.delete(messagesTable);
  await db.delete(bookingEventsTable);
  await db.delete(billItemsTable);
  await db.delete(reviewsTable);
  await db.delete(bookingsTable);
  await db.delete(statementsTable);
  await db.delete(paymentMethodsTable);
  await db.delete(servicesTable);
  await db.delete(providersTable);
  await db.delete(categoriesTable);
  await db.delete(addressesTable);
  await db.delete(membersTable);
  await db.delete(householdsTable);

  console.log("Seeding household...");
  const [household] = await db
    .insert(householdsTable)
    .values({ name: "Mansour Household" })
    .returning();
  const hid = household!.id;

  const members = await db
    .insert(membersTable)
    .values([
      { householdId: hid, name: "Omar Mansour", relation: "Head of household", role: "head", initials: "OM", monthlySpendLimit: null, isCurrentUser: true },
      { householdId: hid, name: "Layla Mansour", relation: "Partner", role: "owner", initials: "LM", monthlySpendLimit: null, isCurrentUser: false },
      { householdId: hid, name: "Zayd Mansour", relation: "Son", role: "member", initials: "ZM", monthlySpendLimit: 500, isCurrentUser: false },
      { householdId: hid, name: "Amira Mansour", relation: "Daughter", role: "member", initials: "AM", monthlySpendLimit: 300, isCurrentUser: false },
      { householdId: hid, name: "Rosa Dela Cruz", relation: "Housekeeper", role: "member", initials: "RD", monthlySpendLimit: 750, isCurrentUser: false },
    ])
    .returning();
  const [omar, layla, zayd, amira, rosa] = members as [
    (typeof members)[number],
    (typeof members)[number],
    (typeof members)[number],
    (typeof members)[number],
    (typeof members)[number],
  ];

  const addresses = await db
    .insert(addressesTable)
    .values([
      { householdId: hid, label: "The Villa", area: "Jumeirah 3", street: "Street 17B, Villa 22", instructions: "Gate code 4412 — providers use the side entrance" },
      { householdId: hid, label: "Dad's Apartment", area: "Downtown Dubai", street: "Burj Views Tower B, Apt 1204", instructions: "Leave with concierge if no answer" },
    ])
    .returning();
  const [villa, apartment] = addresses as [
    (typeof addresses)[number],
    (typeof addresses)[number],
  ];

  console.log("Seeding catalog...");
  const categories = await db
    .insert(categoriesTable)
    .values([
      { name: "Home Cleaning", slug: "home-cleaning", tagline: "Sparkling villas and apartments", icon: "Sparkles", startingPrice: 99 },
      { name: "AC & Cooling", slug: "ac-cooling", tagline: "Repair, service and duct care", icon: "AirVent", startingPrice: 149 },
      { name: "Handyman", slug: "handyman", tagline: "Fixes, mounting and assembly", icon: "Wrench", startingPrice: 79 },
      { name: "Beauty at Home", slug: "beauty", tagline: "Salon-grade care at your door", icon: "Scissors", startingPrice: 120 },
      { name: "Health at Home", slug: "health", tagline: "Nurses, physio and IV therapy", icon: "HeartPulse", startingPrice: 199 },
      { name: "Pest Control", slug: "pest-control", tagline: "Certified, family-safe treatments", icon: "Bug", startingPrice: 199 },
      { name: "Laundry & Pressing", slug: "laundry", tagline: "Collected, cleaned, delivered", icon: "Shirt", startingPrice: 45 },
      { name: "Pool & Garden", slug: "pool-garden", tagline: "Crystal pools, lush gardens", icon: "Droplets", startingPrice: 129 },
    ])
    .returning();
  const cat = Object.fromEntries(categories.map((c) => [c.slug, c.id]));

  const providerRows = await db
    .insert(providersTable)
    .values([
      { categoryId: cat["home-cleaning"]!, name: "Marina Shine Cleaning", tagline: "The deep-clean specialists of Jumeirah", bio: "A 40-strong team trusted by villas across Jumeirah and Umm Suqeim. Eco products, hotel-grade finishing, and the same crew every visit so they learn how your home likes to be kept.", rating: 4.9, reviewCount: 312, jobsCompleted: 4820, yearsOnPlatform: 5, verified: true, availableNow: true, responseMinutes: 12, startingPrice: 199, badges: ["Top Rated", "Same Crew Guarantee", "Eco Products"] },
      { categoryId: cat["home-cleaning"]!, name: "Desert Rose Housekeeping", tagline: "Quiet, meticulous, always on time", bio: "Boutique housekeeping studio focused on apartments and townhouses. Small teams, careful hands, and a checklist tuned over eight years of Dubai homes.", rating: 4.7, reviewCount: 168, jobsCompleted: 2140, yearsOnPlatform: 4, verified: true, availableNow: false, responseMinutes: 25, startingPrice: 99, badges: ["Background Checked"] },
      { categoryId: cat["ac-cooling"]!, name: "Polar AC Engineers", tagline: "2am blowout? We answer.", bio: "Emergency-first AC team covering all of Dubai around the clock. Certified engineers, sealed-spare vans, and a fix-on-first-visit rate above 90%.", rating: 4.8, reviewCount: 402, jobsCompleted: 6230, yearsOnPlatform: 6, verified: true, availableNow: true, responseMinutes: 8, startingPrice: 149, badges: ["24/7 Emergency", "Fix First Visit", "Certified Engineers"] },
      { categoryId: cat["ac-cooling"]!, name: "CoolBreeze Technical Services", tagline: "Ducts, coils and honest advice", bio: "Planned maintenance specialists. Annual contracts, duct deep-cleans and refrigerant work with photo reports after every visit.", rating: 4.6, reviewCount: 221, jobsCompleted: 3105, yearsOnPlatform: 5, verified: true, availableNow: false, responseMinutes: 35, startingPrice: 180, badges: ["Photo Reports"] },
      { categoryId: cat["handyman"]!, name: "Fix & Falcon", tagline: "One visit, a shorter to-do list", bio: "Multi-trade handymen for mounting, assembly, curtains, doors and small electrics. Shoe covers on, dust sheets down, mess gone when we leave.", rating: 4.8, reviewCount: 289, jobsCompleted: 3900, yearsOnPlatform: 4, verified: true, availableNow: true, responseMinutes: 15, startingPrice: 79, badges: ["Multi-Trade", "Tidy Work Promise"] },
      { categoryId: cat["handyman"]!, name: "Atlas Home Repairs", tagline: "Big jobs, small jobs, done properly", bio: "From sticking doors to full snag lists. Transparent quotes before any work starts.", rating: 4.5, reviewCount: 134, jobsCompleted: 1750, yearsOnPlatform: 3, verified: false, availableNow: false, responseMinutes: 45, startingPrice: 89, badges: [] },
      { categoryId: cat["beauty"]!, name: "Glow Mobile Beauty", tagline: "Your salon, your sofa", bio: "Licensed stylists and nail artists who bring the full salon kit to your living room. Loved for event prep and school-morning saves.", rating: 4.9, reviewCount: 356, jobsCompleted: 5210, yearsOnPlatform: 5, verified: true, availableNow: true, responseMinutes: 18, startingPrice: 120, badges: ["Top Rated", "Licensed Stylists"] },
      { categoryId: cat["beauty"]!, name: "Oasis Spa at Home", tagline: "Massage and spa rituals at home", bio: "Certified therapists, warm towels, calm hands. Couples and mum-and-daughter sessions available.", rating: 4.7, reviewCount: 198, jobsCompleted: 2680, yearsOnPlatform: 4, verified: true, availableNow: false, responseMinutes: 40, startingPrice: 220, badges: ["Certified Therapists"] },
      { categoryId: cat["health"]!, name: "Nightingale Home Care", tagline: "Clinical care with a gentle manner", bio: "DHA-licensed nurses and physiotherapists for home visits: elder care, post-op support, physio and IV therapy. The team families ask for by name.", rating: 5.0, reviewCount: 240, jobsCompleted: 3320, yearsOnPlatform: 6, verified: true, availableNow: true, responseMinutes: 20, startingPrice: 199, badges: ["DHA Licensed", "Top Rated", "Elder Care Specialists"] },
      { categoryId: cat["health"]!, name: "DocOnCall Physio", tagline: "Recover where you rest", bio: "Sports and rehab physiotherapists for home sessions. Programmes built around your actual living room, not a clinic.", rating: 4.8, reviewCount: 152, jobsCompleted: 1980, yearsOnPlatform: 3, verified: true, availableNow: false, responseMinutes: 50, startingPrice: 250, badges: ["DHA Licensed"] },
      { categoryId: cat["pest-control"]!, name: "Falcon Shield Pest Control", tagline: "Family-safe, municipality approved", bio: "Approved treatments for ants, roaches, and seasonal invaders. Odour-free options safe for kids and pets, with quarterly protection plans.", rating: 4.7, reviewCount: 187, jobsCompleted: 2470, yearsOnPlatform: 5, verified: true, availableNow: false, responseMinutes: 55, startingPrice: 199, badges: ["Municipality Approved", "Pet Safe"] },
      { categoryId: cat["laundry"]!, name: "PressGo Laundry", tagline: "Collected tonight, crisp tomorrow", bio: "Door-to-door laundry and pressing with 24-hour turnaround. Delicates handled by hand, kanduras and abayas a speciality.", rating: 4.8, reviewCount: 264, jobsCompleted: 8940, yearsOnPlatform: 4, verified: true, availableNow: true, responseMinutes: 10, startingPrice: 45, badges: ["24h Turnaround"] },
      { categoryId: cat["pool-garden"]!, name: "Crystal Pools & Gardens", tagline: "Weekend-ready, every weekend", bio: "Weekly pool chemistry, filter care and garden upkeep for villas. Photo log after every visit so you always know the water is right.", rating: 4.6, reviewCount: 143, jobsCompleted: 2210, yearsOnPlatform: 5, verified: true, availableNow: false, responseMinutes: 60, startingPrice: 129, badges: ["Photo Reports"] },
    ])
    .returning();
  const prov = Object.fromEntries(providerRows.map((p) => [p.name, p.id]));

  const serviceRows = await db
    .insert(servicesTable)
    .values([
      { providerId: prov["Marina Shine Cleaning"]!, name: "Signature Deep Clean", description: "Full-villa deep clean: kitchens degreased, bathrooms descaled, floors machine-polished.", price: 499, durationMinutes: 240 },
      { providerId: prov["Marina Shine Cleaning"]!, name: "Weekly Sparkle Visit", description: "Recurring 3-hour clean with your dedicated crew.", price: 199, durationMinutes: 180 },
      { providerId: prov["Marina Shine Cleaning"]!, name: "Move-In / Move-Out Clean", description: "Empty-home clean with cupboard interiors, balconies and windows.", price: 749, durationMinutes: 360 },
      { providerId: prov["Desert Rose Housekeeping"]!, name: "Apartment Refresh", description: "2-hour clean for apartments up to 2 bedrooms.", price: 99, durationMinutes: 120 },
      { providerId: prov["Desert Rose Housekeeping"]!, name: "Ironing Add-On Visit", description: "2 hours of careful ironing and wardrobe folding.", price: 89, durationMinutes: 120 },
      { providerId: prov["Polar AC Engineers"]!, name: "Emergency AC Repair", description: "Round-the-clock callout: diagnose and fix leaks, failures and warm-air blowouts.", price: 249, durationMinutes: 90 },
      { providerId: prov["Polar AC Engineers"]!, name: "Full AC Service (per unit)", description: "Coil clean, filter wash, gas-pressure check and thermostat calibration.", price: 149, durationMinutes: 60 },
      { providerId: prov["Polar AC Engineers"]!, name: "Villa Cooling Health Check", description: "Whole-villa inspection of all units with a written report.", price: 399, durationMinutes: 150 },
      { providerId: prov["CoolBreeze Technical Services"]!, name: "AC Duct Deep Clean", description: "Full duct vacuum and sanitisation for fresher air.", price: 620, durationMinutes: 240 },
      { providerId: prov["CoolBreeze Technical Services"]!, name: "Annual Maintenance Visit", description: "Scheduled service visit under a yearly care plan.", price: 180, durationMinutes: 90 },
      { providerId: prov["Fix & Falcon"]!, name: "TV Mounting", description: "Wall-mount any size TV, cables concealed, bracket included.", price: 180, durationMinutes: 90 },
      { providerId: prov["Fix & Falcon"]!, name: "Furniture Assembly (per hour)", description: "Flat-pack assembly by the hour, tools and tidy-up included.", price: 79, durationMinutes: 60 },
      { providerId: prov["Fix & Falcon"]!, name: "Curtain & Blind Fitting", description: "Measure, drill and hang curtains or blinds for up to 3 windows.", price: 220, durationMinutes: 120 },
      { providerId: prov["Atlas Home Repairs"]!, name: "Door & Lock Repair", description: "Sticking doors, dropped hinges and lock replacements.", price: 120, durationMinutes: 60 },
      { providerId: prov["Atlas Home Repairs"]!, name: "Snag List Visit (half day)", description: "Work through your list for four hours, materials quoted separately.", price: 349, durationMinutes: 240 },
      { providerId: prov["Glow Mobile Beauty"]!, name: "Blow-Dry & Style", description: "Wash-free blow-dry and styling at home.", price: 120, durationMinutes: 45 },
      { providerId: prov["Glow Mobile Beauty"]!, name: "Gel Manicure & Pedicure", description: "Full gel mani-pedi with salon kit.", price: 240, durationMinutes: 90 },
      { providerId: prov["Glow Mobile Beauty"]!, name: "Event Hair & Makeup", description: "Occasion-ready hair and makeup, trial optional.", price: 550, durationMinutes: 120 },
      { providerId: prov["Oasis Spa at Home"]!, name: "Deep Tissue Massage (60 min)", description: "Certified therapist, table and warm towels included.", price: 220, durationMinutes: 60 },
      { providerId: prov["Oasis Spa at Home"]!, name: "Couples Spa Ritual", description: "Two therapists, ninety minutes, full ritual.", price: 590, durationMinutes: 90 },
      { providerId: prov["Nightingale Home Care"]!, name: "Nurse Home Visit", description: "DHA-licensed nurse for wound care, injections, vitals and post-op checks.", price: 350, durationMinutes: 60 },
      { providerId: prov["Nightingale Home Care"]!, name: "Home Physio Session", description: "One-hour physiotherapy session tailored to mobility goals.", price: 320, durationMinutes: 60 },
      { providerId: prov["Nightingale Home Care"]!, name: "IV Drip Therapy", description: "Hydration and vitamin drips administered by licensed nurses.", price: 499, durationMinutes: 60 },
      { providerId: prov["DocOnCall Physio"]!, name: "Sports Rehab Session", description: "Assessment and rehab programme for injuries.", price: 250, durationMinutes: 60 },
      { providerId: prov["Falcon Shield Pest Control"]!, name: "Quarterly Pest Shield", description: "Full-home treatment with 90-day protection guarantee.", price: 349, durationMinutes: 90 },
      { providerId: prov["Falcon Shield Pest Control"]!, name: "Targeted Ant & Roach Treatment", description: "Odour-free gel treatment for kitchens and bathrooms.", price: 199, durationMinutes: 60 },
      { providerId: prov["PressGo Laundry"]!, name: "Wash & Press — 2 Bags", description: "Two bags collected, washed, pressed and delivered in 24h.", price: 85, durationMinutes: 30 },
      { providerId: prov["PressGo Laundry"]!, name: "Kandura & Abaya Care (5 pieces)", description: "Hand-finished pressing for traditional wear.", price: 95, durationMinutes: 30 },
      { providerId: prov["PressGo Laundry"]!, name: "Duvet & Linen Refresh", description: "Deep wash for duvets, covers and bed linen.", price: 120, durationMinutes: 30 },
      { providerId: prov["Crystal Pools & Gardens"]!, name: "Weekly Pool Care", description: "Chemistry balance, skim, vacuum and filter check with photo log.", price: 129, durationMinutes: 60 },
      { providerId: prov["Crystal Pools & Gardens"]!, name: "Garden Tidy (2 hours)", description: "Pruning, sweeping, irrigation check and green-waste removal.", price: 179, durationMinutes: 120 },
    ])
    .returning();
  const svc = Object.fromEntries(serviceRows.map((s) => [s.name, s]));

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
    const [b] = await db
      .insert(bookingsTable)
      .values({
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
      })
      .returning();
    if (v.events.length > 0) {
      await db.insert(bookingEventsTable).values(
        v.events.map((e) => ({
          bookingId: b!.id,
          status: e.status,
          note: e.note,
          occurredAt: e.at,
        })),
      );
    }
    return b!;
  };

  // Live right now: AC emergency, provider en route.
  const acBooking = await mkBooking({
    service: "Emergency AC Repair",
    member: omar.id,
    address: villa.id,
    scheduledAt: inMins(20),
    status: "en_route",
    eta: 18,
    instructions: "Master bedroom AC is leaking water through the vent — bucket underneath for now.",
    createdAt: minsAgo(45),
    events: [
      { status: "pending", note: "Booking placed — waiting for the provider to accept", at: minsAgo(45) },
      { status: "confirmed", note: "Polar AC Engineers accepted the job", at: minsAgo(41) },
      { status: "en_route", note: "Polar AC Engineers is on the way to The Villa", at: minsAgo(12) },
    ],
  });

  // Live right now: physio session in progress.
  const physioBooking = await mkBooking({
    service: "Home Physio Session",
    member: layla.id,
    address: villa.id,
    scheduledAt: hoursAgo(1),
    status: "in_progress",
    instructions: "Physio for Teta Farida — gentle knee mobility work, she gets nervous.",
    createdAt: daysAgo(1),
    events: [
      { status: "pending", note: "Booking placed — waiting for the provider to accept", at: daysAgo(1) },
      { status: "confirmed", note: "Nightingale Home Care accepted the job", at: new Date(daysAgo(1).getTime() + 6 * 60_000) },
      { status: "en_route", note: "Nightingale Home Care is on the way to The Villa", at: minsAgo(100) },
      { status: "arrived", note: "Provider arrived at The Villa", at: minsAgo(70) },
      { status: "in_progress", note: "Work has started", at: minsAgo(60) },
    ],
  });

  // Upcoming.
  await mkBooking({
    service: "Signature Deep Clean",
    member: layla.id,
    address: villa.id,
    scheduledAt: at(1, 10, 0),
    status: "confirmed",
    instructions: "Focus on the kitchen and the majlis — guests on Friday.",
    createdAt: daysAgo(1),
    events: [
      { status: "pending", note: "Booking placed — waiting for the provider to accept", at: daysAgo(1) },
      { status: "confirmed", note: "Marina Shine Cleaning accepted the job", at: new Date(daysAgo(1).getTime() + 9 * 60_000) },
    ],
  });
  await mkBooking({
    service: "Blow-Dry & Style",
    member: amira.id,
    address: villa.id,
    scheduledAt: at(3, 16, 0),
    status: "pending",
    instructions: null,
    createdAt: hoursAgo(2),
    events: [{ status: "pending", note: "Booking placed — waiting for the provider to accept", at: hoursAgo(2) }],
  });
  await mkBooking({
    service: "Weekly Pool Care",
    member: rosa.id,
    address: villa.id,
    scheduledAt: at(6, 8, 0),
    status: "confirmed",
    instructions: "Pool filter has been noisy since last week.",
    createdAt: daysAgo(2),
    events: [
      { status: "pending", note: "Booking placed — waiting for the provider to accept", at: daysAgo(2) },
      { status: "confirmed", note: "Crystal Pools & Gardens accepted the job", at: new Date(daysAgo(2).getTime() + 30 * 60_000) },
    ],
  });

  // Completed this month (feed the open August bill).
  const completedEvents = (created: Date, done: Date, provider: string, price: number) => [
    { status: "pending", note: "Booking placed — waiting for the provider to accept", at: created },
    { status: "confirmed", note: `${provider} accepted the job`, at: new Date(created.getTime() + 5 * 60_000) },
    { status: "completed", note: `Job completed — AED ${price} added to the household bill`, at: done },
  ];
  const laundryDone = await mkBooking({
    service: "Wash & Press — 2 Bags",
    member: rosa.id,
    address: villa.id,
    scheduledAt: daysAgo(1),
    status: "completed",
    createdAt: daysAgo(2),
    events: completedEvents(daysAgo(2), daysAgo(1), "PressGo Laundry", 85),
  });
  const tvDone = await mkBooking({
    service: "TV Mounting",
    member: omar.id,
    address: apartment.id,
    scheduledAt: new Date(daysAgo(1).getTime() - 7 * 60 * 60_000),
    status: "completed",
    instructions: "75-inch TV for the study wall.",
    createdAt: daysAgo(3),
    events: completedEvents(daysAgo(3), new Date(daysAgo(1).getTime() - 5 * 60 * 60_000), "Fix & Falcon", 180),
  });
  const pestDone = await mkBooking({
    service: "Quarterly Pest Shield",
    member: layla.id,
    address: villa.id,
    scheduledAt: hoursAgo(5),
    status: "completed",
    createdAt: daysAgo(2),
    events: completedEvents(daysAgo(2), hoursAgo(3), "Falcon Shield Pest Control", 349),
  });

  // Completed last month (paid July statement).
  const julyClean = await mkBooking({
    service: "Signature Deep Clean",
    member: layla.id,
    address: villa.id,
    scheduledAt: daysAgo(25),
    status: "completed",
    createdAt: daysAgo(26),
    events: completedEvents(daysAgo(26), daysAgo(25), "Marina Shine Cleaning", 499),
  });
  const julyDuct = await mkBooking({
    service: "AC Duct Deep Clean",
    member: omar.id,
    address: villa.id,
    scheduledAt: daysAgo(20),
    status: "completed",
    createdAt: daysAgo(22),
    events: completedEvents(daysAgo(22), daysAgo(20), "CoolBreeze Technical Services", 620),
  });
  const julyNurse = await mkBooking({
    service: "Nurse Home Visit",
    member: layla.id,
    address: villa.id,
    scheduledAt: daysAgo(15),
    status: "completed",
    createdAt: daysAgo(16),
    events: completedEvents(daysAgo(16), daysAgo(15), "Nightingale Home Care", 350),
  });
  const julyAssembly = await mkBooking({
    service: "Furniture Assembly (per hour)",
    member: zayd.id,
    address: villa.id,
    scheduledAt: daysAgo(10),
    status: "completed",
    instructions: "Gaming desk and shelf unit.",
    createdAt: daysAgo(11),
    events: completedEvents(daysAgo(11), daysAgo(10), "Fix & Falcon", 79),
  });

  // One cancelled booking.
  await mkBooking({
    service: "Door & Lock Repair",
    member: zayd.id,
    address: villa.id,
    scheduledAt: daysAgo(5),
    status: "cancelled",
    createdAt: daysAgo(7),
    events: [
      { status: "pending", note: "Booking placed — waiting for the provider to accept", at: daysAgo(7) },
      { status: "confirmed", note: "Atlas Home Repairs accepted the job", at: new Date(daysAgo(7).getTime() + 60 * 60_000) },
      { status: "cancelled", note: "Booking cancelled by the household", at: daysAgo(6) },
    ],
  });

  console.log("Seeding chat messages...");
  await db.insert(messagesTable).values([
    { bookingId: acBooking.id, sender: "member", senderName: "Omar Mansour", body: "The AC in the master bedroom is dripping through the vent — I've put a bucket under it.", sentAt: minsAgo(38) },
    { bookingId: acBooking.id, sender: "provider", senderName: "Polar AC Engineers", body: "Thanks for the details. Sounds like a blocked drain line — I'll bring the vacuum pump.", sentAt: minsAgo(35) },
    { bookingId: acBooking.id, sender: "member", senderName: "Omar Mansour", body: "Gate code is 4412, use the side entrance please.", sentAt: minsAgo(30) },
    { bookingId: acBooking.id, sender: "provider", senderName: "Polar AC Engineers", body: "Perfect. On my way now — traffic on SZR is light, see you in about 15 minutes.", sentAt: minsAgo(12) },
    { bookingId: physioBooking.id, sender: "provider", senderName: "Nightingale Home Care", body: "Session started — we're warming up gently, she's doing well.", sentAt: minsAgo(55) },
    { bookingId: physioBooking.id, sender: "member", senderName: "Layla Mansour", body: "Thank you — she was nervous this morning, glad it's going smoothly.", sentAt: minsAgo(50) },
  ]);

  console.log("Seeding the pack thread and requests...");
  await db.insert(packMessagesTable).values([
    { householdId: hid, memberId: omar.id, body: "Pest control is done — kitchen is back in action tonight.", sentAt: hoursAgo(3) },
    { householdId: hid, memberId: rosa.id, body: "Laundry pickup done, everything back Thursday.", sentAt: hoursAgo(2) },
    { householdId: hid, memberId: zayd.id, body: "Can someone approve my AC request before tonight? It's boiling in my room 🥵", sentAt: minsAgo(95) },
    { householdId: hid, memberId: layla.id, body: "Physio's here — settling Teta in now, she's calm.", sentAt: minsAgo(55) },
    { householdId: hid, memberId: amira.id, body: "Also I put in a request for Saturday hair, pretty please 🙏", sentAt: minsAgo(40) },
  ]);
  // Omar last opened the thread ~90 minutes ago, so the newest messages are unread.
  await db
    .update(membersTable)
    .set({ packLastReadAt: minsAgo(90) })
    .where(eq(membersTable.id, omar.id));

  await db.insert(serviceRequestsTable).values([
    { householdId: hid, memberId: zayd.id, serviceId: svc["Full AC Service (per unit)"]!.id, note: "My room's AC is barely cooling", status: "pending", createdAt: minsAgo(100) },
    { householdId: hid, memberId: amira.id, serviceId: svc["Blow-Dry & Style"]!.id, note: "Saturday morning?", status: "pending", createdAt: minsAgo(45) },
  ]);

  console.log("Seeding billing...");
  const augustLabel = monthLabel(now);
  const july = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const june = new Date(now.getFullYear(), now.getMonth() - 2, 15);
  const may = new Date(now.getFullYear(), now.getMonth() - 3, 15);
  const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 21, 14, 0);

  const [mayStmt] = await db.insert(statementsTable).values({ householdId: hid, monthLabel: monthLabel(may), status: "paid", total: 2140, itemCount: 9, paidAt: endOfMonth(may), paidWith: "Visa •••• 4421", createdAt: new Date(may.getFullYear(), may.getMonth(), 1) }).returning();
  void mayStmt;
  await db.insert(statementsTable).values({ householdId: hid, monthLabel: monthLabel(june), status: "paid", total: 1685.5, itemCount: 7, paidAt: endOfMonth(june), paidWith: "Loup Wallet", createdAt: new Date(june.getFullYear(), june.getMonth(), 1) });
  const [julyStmt] = await db.insert(statementsTable).values({ householdId: hid, monthLabel: monthLabel(july), status: "paid", total: 1548, itemCount: 4, paidAt: endOfMonth(july), paidWith: "Visa •••• 4421", createdAt: new Date(july.getFullYear(), july.getMonth(), 1) }).returning();
  const [augustStmt] = await db.insert(statementsTable).values({ householdId: hid, monthLabel: augustLabel, status: "open", total: 614, itemCount: 3, createdAt: new Date(now.getFullYear(), now.getMonth(), 1) }).returning();

  await db.insert(billItemsTable).values([
    { statementId: julyStmt!.id, bookingId: julyClean.id, amount: 499, date: daysAgo(25) },
    { statementId: julyStmt!.id, bookingId: julyDuct.id, amount: 620, date: daysAgo(20) },
    { statementId: julyStmt!.id, bookingId: julyNurse.id, amount: 350, date: daysAgo(15) },
    { statementId: julyStmt!.id, bookingId: julyAssembly.id, amount: 79, date: daysAgo(10) },
    { statementId: augustStmt!.id, bookingId: laundryDone.id, amount: 85, date: daysAgo(1) },
    { statementId: augustStmt!.id, bookingId: tvDone.id, amount: 180, date: new Date(daysAgo(1).getTime() - 5 * 60 * 60_000) },
    { statementId: augustStmt!.id, bookingId: pestDone.id, amount: 349, date: hoursAgo(3) },
  ]);

  await db.insert(paymentMethodsTable).values([
    { householdId: hid, type: "card", label: "Visa •••• 4421", detail: "Omar Mansour — expires 09/28", isDefault: true },
    { householdId: hid, type: "wallet", label: "Loup Wallet", detail: "Balance: AED 1,250", isDefault: false },
    { householdId: hid, type: "cash", label: "Cash on completion", detail: "Pay the provider directly when the job is done", isDefault: false },
  ]);

  console.log("Seeding reviews...");
  await db.insert(reviewsTable).values([
    { providerId: prov["Marina Shine Cleaning"]!, bookingId: julyClean.id, authorName: "Layla Mansour", rating: 5, comment: "The villa has never looked this good. Same crew as always — they know exactly how we like the majlis done.", createdAt: daysAgo(24) },
    { providerId: prov["Marina Shine Cleaning"]!, bookingId: null, authorName: "Fatima K.", rating: 5, comment: "Booked the deep clean before Eid and they worked miracles. Worth every dirham.", createdAt: daysAgo(40) },
    { providerId: prov["Marina Shine Cleaning"]!, bookingId: null, authorName: "James R.", rating: 4, comment: "Thorough and professional. Slightly late but they called ahead.", createdAt: daysAgo(60) },
    { providerId: prov["Polar AC Engineers"]!, bookingId: null, authorName: "Hassan A.", rating: 5, comment: "AC died at 1am in July. They were here by 2, fixed by 3. Lifesavers.", createdAt: daysAgo(30) },
    { providerId: prov["Polar AC Engineers"]!, bookingId: null, authorName: "Priya S.", rating: 5, comment: "Honest about what needed replacing and what didn't. Rare.", createdAt: daysAgo(75) },
    { providerId: prov["Polar AC Engineers"]!, bookingId: null, authorName: "Mohammed B.", rating: 4, comment: "Quick response, tidy work. Booking again for the annual service.", createdAt: daysAgo(90) },
    { providerId: prov["Fix & Falcon"]!, bookingId: julyAssembly.id, authorName: "Zayd Mansour", rating: 5, comment: "Desk and shelves up in under an hour. Zero mess left behind.", createdAt: daysAgo(9) },
    { providerId: prov["Fix & Falcon"]!, bookingId: null, authorName: "Sara M.", rating: 5, comment: "Mounted three TVs and hid every cable. My walls look showroom-clean.", createdAt: daysAgo(45) },
    { providerId: prov["Glow Mobile Beauty"]!, bookingId: null, authorName: "Noora H.", rating: 5, comment: "Event makeup at home saved my morning. Flawless until midnight.", createdAt: daysAgo(20) },
    { providerId: prov["Glow Mobile Beauty"]!, bookingId: null, authorName: "Aisha T.", rating: 5, comment: "The blow-dry lasted three days in August humidity. Enough said.", createdAt: daysAgo(55) },
    { providerId: prov["Nightingale Home Care"]!, bookingId: julyNurse.id, authorName: "Layla Mansour", rating: 5, comment: "Gentle, patient and completely professional with my mother. We only book Nightingale now.", createdAt: daysAgo(14) },
    { providerId: prov["Nightingale Home Care"]!, bookingId: null, authorName: "Omar D.", rating: 5, comment: "Post-surgery care at home, handled perfectly. The nurse explained everything.", createdAt: daysAgo(70) },
    { providerId: prov["PressGo Laundry"]!, bookingId: null, authorName: "Khalid N.", rating: 5, comment: "Kanduras come back crisp every single time. 24h promise is real.", createdAt: daysAgo(35) },
    { providerId: prov["Falcon Shield Pest Control"]!, bookingId: null, authorName: "Elena V.", rating: 5, comment: "No smell, no ants, no drama. Kids were back in the kitchen the same evening.", createdAt: daysAgo(50) },
    { providerId: prov["Crystal Pools & Gardens"]!, bookingId: null, authorName: "Tariq J.", rating: 4, comment: "Pool has been perfect all summer. Photo log after each visit is a nice touch.", createdAt: daysAgo(28) },
    { providerId: prov["Desert Rose Housekeeping"]!, bookingId: null, authorName: "Mina L.", rating: 5, comment: "Quiet, careful and always on time. My apartment smells like a hotel.", createdAt: daysAgo(33) },
  ]);

  console.log("Seeding Nexa employer programme...");
  const [employer] = await db
    .insert(employersTable)
    .values({
      name: "Nexa Technologies",
      slug: "nexa",
      country: "AE",
      active: true,
    })
    .returning();
  const [benefitProgram] = await db
    .insert(benefitProgramsTable)
    .values({
      employerId: employer!.id,
      name: "Nexa Life Administration Benefit",
      period: "monthly",
      allowanceAmount: 500,
      renewalDate: new Date(now.getFullYear(), now.getMonth() + 1, 1)
        .toISOString()
        .slice(0, 10),
      expirationPolicy: "Unused allowance expires at period end",
      householdAccess: true,
      maxHouseholdMembers: 3,
      maxHouseholdAllocationPct: 50,
      active: true,
    })
    .returning();

  const today = now.toISOString().slice(0, 10);
  const detailedEmployees = [
    {
      externalEmployeeId: "NEXA-0001",
      name: "Omar Mansour",
      workEmail: "omar.mansour@nexa.example",
      department: "Strategy",
      benefitTier: "Core",
      householdEligible: true,
      linkedMemberId: omar.id,
    },
    {
      externalEmployeeId: "NEXA-0002",
      name: "Layla Mansour",
      workEmail: "layla.mansour@nexa.example",
      department: "People",
      benefitTier: "Core",
      householdEligible: true,
      linkedMemberId: layla.id,
    },
    {
      externalEmployeeId: "NEXA-0003",
      name: "Zayd Mansour",
      workEmail: "zayd.mansour@nexa.example",
      department: "Engineering",
      benefitTier: "Core",
      householdEligible: false,
      linkedMemberId: zayd.id,
    },
    {
      externalEmployeeId: "NEXA-0004",
      name: "Amira Mansour",
      workEmail: "amira.mansour@nexa.example",
      department: "Design",
      benefitTier: "Core",
      householdEligible: false,
      linkedMemberId: amira.id,
    },
    {
      externalEmployeeId: "NEXA-0005",
      name: "Rosa Dela Cruz",
      workEmail: "rosa.delacruz@nexa.example",
      department: "Workplace",
      benefitTier: "Core",
      householdEligible: false,
      linkedMemberId: rosa.id,
    },
  ];
  const rosterEmployees = Array.from({ length: 121 }, (_, index) => ({
    externalEmployeeId: `NEXA-${String(index + 6).padStart(4, "0")}`,
    name: `Nexa colleague ${String(index + 6).padStart(3, "0")}`,
    workEmail: `colleague${index + 6}@nexa.example`,
    department: ["Engineering", "People", "Finance", "Commercial"][
      index % 4
    ]!,
    benefitTier: index % 7 === 0 ? "Plus" : "Core",
    householdEligible: index % 5 !== 0,
    linkedMemberId: null,
  }));
  const seededEmployees = await db
    .insert(employeesTable)
    .values(
      [...detailedEmployees, ...rosterEmployees].map((employee) => ({
        employerId: employer!.id,
        externalEmployeeId: employee.externalEmployeeId,
        name: employee.name,
        workEmail: employee.workEmail,
        department: employee.department,
        benefitTier: employee.benefitTier,
        eligibilityStatus: "eligible",
        householdEligible: employee.householdEligible,
        linkedMemberId: employee.linkedMemberId,
        startDate: today,
      })),
    )
    .returning();
  const omarEmployee = seededEmployees.find(
    (employee) => employee.externalEmployeeId === "NEXA-0001",
  )!;

  await db.insert(allowanceLedgerTable).values([
    {
      employerId: employer!.id,
      employeeId: omarEmployee.id,
      entryType: "authorized",
      amount: 500,
      referenceType: "benefit_programme",
      referenceId: benefitProgram!.id,
      note: "Monthly employer-authorized allowance",
    },
    {
      employerId: employer!.id,
      employeeId: omarEmployee.id,
      entryType: "reserved",
      amount: 120,
      referenceType: "booking",
      referenceId: acBooking.id,
      note: "Reserved for an eligible home-maintenance booking",
    },
    {
      employerId: employer!.id,
      employeeId: omarEmployee.id,
      entryType: "redeemed",
      amount: 85,
      referenceType: "booking",
      referenceId: laundryDone.id,
      note: "Redeemed after service completion",
    },
  ]);

  await db.insert(routinesTable).values([
    {
      memberId: omar.id,
      categorySlug: "home-cleaning",
      label: "Weekly home care",
      frequency: "Weekly",
      preferredDay: "Saturday",
      preferredTime: "10:00",
      maxCopayment: 75,
      automaticReminder: true,
      manualConfirmation: true,
      status: "active",
    },
    {
      memberId: omar.id,
      categorySlug: "home-maintenance",
      label: "Quarterly cooling check",
      frequency: "Quarterly",
      preferredDay: "First Sunday",
      preferredTime: "09:00",
      maxCopayment: 100,
      automaticReminder: true,
      manualConfirmation: true,
      status: "active",
    },
  ]);

  await db.insert(auditEventsTable).values([
    {
      actorRole: "operations",
      actorId: "ops-demo",
      action: "matching.override",
      entityType: "booking",
      entityId: String(acBooking.id),
      metadata: { reason: "Coverage continuity for the household" },
    },
    {
      actorRole: "employer",
      actorId: "nexa-admin",
      action: "benefit_programme.updated",
      entityType: "benefit_programme",
      entityId: String(benefitProgram!.id),
      metadata: { field: "householdAccess", value: true },
    },
    {
      actorRole: "employee",
      actorId: "omar-demo",
      action: "allowance.reserved",
      entityType: "ledger",
      entityId: String(omarEmployee.id),
      metadata: { amount: 120, category: "home-maintenance" },
    },
  ]);

  console.log("Seed complete.");
  console.log(`Household: Mansour (${members.length} members), providers: ${providerRows.length}, services: ${serviceRows.length}`);
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
