import { describe, it, expect } from "vitest";
import { MEDIA_CARD_FIELDS } from "../graphql/fragments/mediaCard.gql.js";
import {
  buildSeasonPageQuery,
  LEFTOVER_MEDIA_GQL,
  SEASON_ARCHIVE_GQL,
} from "../graphql/queries/seasonPage.gql.js";
import {
  AIRING_SCHEDULE_GQL,
  UPCOMING_MEDIA_GQL,
} from "../graphql/queries/schedule.gql.js";
import { HOME_HERO_GQL } from "../graphql/queries/homeHero.gql.js";

/**
 * These queries used to carry four hand-copied field lists that had already
 * drifted from each other. The regression this guards is not a crash — it is a
 * field quietly missing from one endpoint, which surfaces as `null` on one
 * screen and a real value on another.
 */
const CARD_QUERIES = {
  "season page": buildSeasonPageQuery(false),
  "season page (popular)": buildSeasonPageQuery(true),
  leftovers: LEFTOVER_MEDIA_GQL,
  airing: AIRING_SCHEDULE_GQL,
  upcoming: UPCOMING_MEDIA_GQL,
  "home hero": HOME_HERO_GQL,
};

describe("MEDIA_CARD_FIELDS", () => {
  it.each(Object.entries(CARD_QUERIES))(
    "the %s query embeds the shared field set",
    (_name, query) => {
      expect(query).toContain(MEDIA_CARD_FIELDS);
    },
  );

  it("requests duration, which formatAnimeList has always been ready to map", () => {
    // `formatAnimeList` reads `anime.duration` into `meta.duration`, but no
    // query asked AniList for it, so every card served null for a field the
    // formatter could fill. This is the assertion that keeps it asked for.
    expect(MEDIA_CARD_FIELDS).toContain("duration");
  });

  it.each([
    "source",
    "favourites",
    "popularity",
    "seasonYear",
    "format",
    "trailer",
  ])("requests %s", (field) => {
    expect(MEDIA_CARD_FIELDS).toContain(field);
  });

  it("asks for the branding fields on external links, not just the url", () => {
    // `color` and `icon` are what make these render as recognisable brand
    // chips; without them a client has to keep its own site-to-colour table.
    expect(MEDIA_CARD_FIELDS).toMatch(
      /externalLinks\s*{[^}]*\bcolor\b[^}]*\bicon\b[^}]*}/,
    );
  });

  it("restricts relation nodes to what a card label needs", () => {
    expect(MEDIA_CARD_FIELDS).toContain("relationType");
    expect(MEDIA_CARD_FIELDS).toMatch(/relations\s*{/);
  });
});

describe("SEASON_ARCHIVE_GQL", () => {
  it("aliases all four seasons into one request", () => {
    // One request per year instead of four matters because AniList is capped
    // at 25 requests/minute for the whole app; a query-per-season archive
    // would drain the window before it finished rendering.
    for (const season of ["WINTER", "SPRING", "SUMMER", "FALL"]) {
      expect(SEASON_ARCHIVE_GQL).toContain(`${season}: Page(`);
    }
  });

  it("asks for the count and exactly one cover per season", () => {
    expect(SEASON_ARCHIVE_GQL).toContain("pageInfo { total }");
    expect(SEASON_ARCHIVE_GQL.match(/perPage: 1\b/g)).toHaveLength(4);
  });

  it("does not drag the full card field set into an index screen", () => {
    expect(SEASON_ARCHIVE_GQL).not.toContain(MEDIA_CARD_FIELDS);
  });
});

describe("paginated queries", () => {
  it.each([
    ["airing", AIRING_SCHEDULE_GQL],
    ["upcoming", UPCOMING_MEDIA_GQL],
  ])("%s asks whether more pages exist", (_name, query) => {
    // A week of airings exceeds AniList's 50-item page cap, and a silent
    // truncation lands at the *end* of the week where nothing looks wrong.
    expect(query).toContain("hasNextPage");
    expect(query).toContain("$page");
  });
});
