import { Router, type IRouter } from "express";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import {
  db,
  bookingsTable,
  categoriesTable,
  providersTable,
  reviewsTable,
  servicesTable,
} from "@workspace/db";
import {
  CreateReviewBody,
  CreateReviewResponse,
  GetProviderParams,
  GetProviderResponse,
  ListCategoriesResponse,
  ListProviderReviewsParams,
  ListProviderReviewsResponse,
  ListProvidersQueryParams,
  ListProvidersResponse,
} from "@workspace/api-zod";
import { BOOKABLE_CATEGORY_SLUGS } from "../lib/loup";

const router: IRouter = Router();

const PLATFORM_CATEGORIES = [
  {
    slug: "home-cleaning",
    name: "Home Cleaning",
    tagline: "A considered reset for the rooms you live in.",
    icon: "sparkles",
  },
  {
    slug: "laundry",
    name: "Laundry & Pressing",
    tagline: "Fresh laundry, folded and ready to return to.",
    icon: "shirt",
  },
  {
    slug: "home-maintenance",
    name: "Home Maintenance",
    tagline: "Keep the essential systems of home quietly working.",
    icon: "wrench",
  },
] as const;

const CATEGORY_ALIASES: Record<string, readonly string[]> = {
  "home-cleaning": ["home-cleaning"],
  laundry: ["laundry"],
  "home-maintenance": ["ac-cooling", "handyman"],
};

function platformCategory(slug: string) {
  if (slug === "ac-cooling" || slug === "handyman") {
    return PLATFORM_CATEGORIES[2]!;
  }
  return PLATFORM_CATEGORIES.find((category) => category.slug === slug);
}

const providerSelection = {
  id: providersTable.id,
  name: providersTable.name,
  categorySlug: categoriesTable.slug,
  categoryName: categoriesTable.name,
  tagline: providersTable.tagline,
  bio: providersTable.bio,
  rating: providersTable.rating,
  reviewCount: providersTable.reviewCount,
  jobsCompleted: providersTable.jobsCompleted,
  yearsOnPlatform: providersTable.yearsOnPlatform,
  verified: providersTable.verified,
  availableNow: providersTable.availableNow,
  responseMinutes: providersTable.responseMinutes,
  startingPrice: providersTable.startingPrice,
  badges: providersTable.badges,
};

router.get("/categories", async (_req, res): Promise<void> => {
  const categories = await db
    .select()
    .from(categoriesTable)
    .where(inArray(categoriesTable.slug, BOOKABLE_CATEGORY_SLUGS))
    .orderBy(categoriesTable.id);
  const providers = await db
    .select({ categoryId: providersTable.categoryId })
    .from(providersTable);
  const counts = new Map<number, number>();
  for (const p of providers) {
    counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
  }
  const data = ListCategoriesResponse.parse(
    PLATFORM_CATEGORIES.map((category, index) => {
      const sourceRows = categories.filter((row) =>
        (CATEGORY_ALIASES[category.slug] ?? []).includes(row.slug),
      );
      return {
        id: index + 1,
        name: category.name,
        slug: category.slug,
        tagline: category.tagline,
        icon: category.icon,
        providerCount: sourceRows.reduce(
          (total, row) => total + (counts.get(row.id) ?? 0),
          0,
        ),
        startingPrice: sourceRows.length
          ? Math.min(...sourceRows.map((row) => row.startingPrice))
          : 0,
      };
    }),
  );
  res.json(data);
});

router.get("/providers", async (req, res): Promise<void> => {
  const query = ListProvidersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { category, search, availableNow } = query.data;

  const conditions = [];
  if (category) {
    conditions.push(
      inArray(categoriesTable.slug, CATEGORY_ALIASES[category] ?? []),
    );
  }
  if (search) {
    conditions.push(
      or(
        ilike(providersTable.name, `%${search}%`),
        ilike(providersTable.tagline, `%${search}%`),
        ilike(categoriesTable.name, `%${search}%`),
      ),
    );
  }
  if (availableNow) {
    conditions.push(eq(providersTable.availableNow, true));
  }
  conditions.push(inArray(categoriesTable.slug, BOOKABLE_CATEGORY_SLUGS));

  let providerQuery = db
    .select(providerSelection)
    .from(providersTable)
    .innerJoin(categoriesTable, eq(providersTable.categoryId, categoriesTable.id))
    .$dynamic();
  if (conditions.length > 0) {
    providerQuery = providerQuery.where(and(...conditions));
  }
  const rows = await providerQuery.orderBy(
    desc(providersTable.availableNow),
    desc(providersTable.rating),
  );
  res.json(
    ListProvidersResponse.parse(
      rows.map((row) => {
        const category = platformCategory(row.categorySlug);
        return category
          ? { ...row, categorySlug: category.slug, categoryName: category.name }
          : row;
      }),
    ),
  );
});

router.get("/providers/:id", async (req, res): Promise<void> => {
  const params = GetProviderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [provider] = await db
    .select(providerSelection)
    .from(providersTable)
    .innerJoin(categoriesTable, eq(providersTable.categoryId, categoriesTable.id))
    .where(
      and(
        eq(providersTable.id, params.data.id),
        inArray(categoriesTable.slug, BOOKABLE_CATEGORY_SLUGS),
      ),
    );
  if (!provider) {
    res.status(404).json({ error: "Provider not found" });
    return;
  }
  const services = await db
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.providerId, provider.id))
    .orderBy(servicesTable.price);
  const category = platformCategory(provider.categorySlug);
  if (!category) {
    res.status(404).json({ error: "Provider not found" });
    return;
  }
  res.json(
    GetProviderResponse.parse({
      ...provider,
      categorySlug: category.slug,
      categoryName: category.name,
      services,
    }),
  );
});

router.get("/providers/:id/reviews", async (req, res): Promise<void> => {
  const params = ListProviderReviewsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.providerId, params.data.id))
    .orderBy(desc(reviewsTable.createdAt));
  res.json(
    ListProviderReviewsResponse.parse(
      rows.map(({ bookingId: _b, ...review }) => review),
    ),
  );
});

router.post("/reviews", async (req, res): Promise<void> => {
  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { bookingId, rating, comment } = parsed.data;

  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.id, bookingId));
  if (!booking) {
    res.status(400).json({ error: "Booking not found" });
    return;
  }
  if (booking.status !== "completed") {
    res.status(400).json({ error: "Only completed bookings can be reviewed" });
    return;
  }
  const existing = await db
    .select({ id: reviewsTable.id })
    .from(reviewsTable)
    .where(eq(reviewsTable.bookingId, bookingId));
  if (existing.length > 0) {
    res.status(400).json({ error: "This booking has already been reviewed" });
    return;
  }

  const { membersTable } = await import("@workspace/db");
  const [member] = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.id, booking.memberId));

  const [review] = await db
    .insert(reviewsTable)
    .values({
      providerId: booking.providerId,
      bookingId,
      authorName: member?.name ?? "Household member",
      rating,
      comment,
    })
    .returning();

  const allRatings = await db
    .select({ rating: reviewsTable.rating })
    .from(reviewsTable)
    .where(eq(reviewsTable.providerId, booking.providerId));
  const average =
    allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
  await db
    .update(providersTable)
    .set({
      rating: Math.round(average * 10) / 10,
      reviewCount: allRatings.length,
    })
    .where(eq(providersTable.id, booking.providerId));

  req.log.info({ bookingId }, "Review created");
  const { bookingId: _b, ...reviewOut } = review!;
  res.status(201).json(CreateReviewResponse.parse(reviewOut));
});

export default router;
