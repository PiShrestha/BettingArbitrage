import { ProviderEndpoint, ProviderOddsPayload } from "../ingestOdds";

interface RunnerTemplate {
  id: string;
  name: string;
  baseOdds: Record<string, number>;
}

interface EventTemplate {
  id: string;
  name: string;
  startTimeOffsetMinutes: number;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  marketId: string;
  marketName: string;
  runners: RunnerTemplate[];
}

const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: "soccer-prem-1",
    name: "Chelsea vs Arsenal",
    startTimeOffsetMinutes: 120,
    sport: "soccer",
    league: "Premier League",
    homeTeam: "Chelsea",
    awayTeam: "Arsenal",
    marketId: "match-winner",
    marketName: "Match Winner",
    runners: [
      {
        id: "chelsea",
        name: "Chelsea",
        baseOdds: {
          "fixture-alpha": 2.12,
          "fixture-beta": 2.05,
        },
      },
      {
        id: "arsenal",
        name: "Arsenal",
        baseOdds: {
          "fixture-alpha": 1.9,
          "fixture-beta": 2.18,
        },
      },
    ],
  },
  {
    id: "nba-regular-1",
    name: "Lakers vs Warriors",
    startTimeOffsetMinutes: 240,
    sport: "basketball",
    league: "NBA",
    homeTeam: "Lakers",
    awayTeam: "Warriors",
    marketId: "moneyline",
    marketName: "Moneyline",
    runners: [
      {
        id: "lakers",
        name: "Lakers",
        baseOdds: {
          "fixture-alpha": 1.88,
          "fixture-beta": 2.04,
        },
      },
      {
        id: "warriors",
        name: "Warriors",
        baseOdds: {
          "fixture-alpha": 2.22,
          "fixture-beta": 1.94,
        },
      },
    ],
  },
  {
    id: "tennis-open-1",
    name: "Alcaraz vs Sinner",
    startTimeOffsetMinutes: 360,
    sport: "tennis",
    league: "ATP",
    homeTeam: "Carlos Alcaraz",
    awayTeam: "Jannik Sinner",
    marketId: "match-winner",
    marketName: "Match Winner",
    runners: [
      {
        id: "alcaraz",
        name: "Carlos Alcaraz",
        baseOdds: {
          "fixture-alpha": 1.76,
          "fixture-beta": 1.84,
        },
      },
      {
        id: "sinner",
        name: "Jannik Sinner",
        baseOdds: {
          "fixture-alpha": 2.12,
          "fixture-beta": 2.04,
        },
      },
    ],
  },
];

function withVariance(base: number): number {
  const variance = base * 0.025; // ±2.5%
  const adjustment = (Math.random() - 0.5) * 2 * variance;
  return Number((base + adjustment).toFixed(3));
}

function buildPayload(providerSlug: string): ProviderOddsPayload {
  const now = Date.now();
  const events = EVENT_TEMPLATES.map((event) => ({
    id: event.id,
    name: event.name,
    startTime: new Date(
      now + event.startTimeOffsetMinutes * 60 * 1000
    ).toISOString(),
    sport: event.sport,
    league: event.league,
    homeTeam: event.homeTeam,
    awayTeam: event.awayTeam,
    markets: [
      {
        id: event.marketId,
        name: event.marketName,
        type: "moneyline" as const,
        runners: event.runners.map((runner) => {
          const baseOdds = runner.baseOdds[providerSlug];
          if (!baseOdds) {
            throw new Error(
              `No base odds configured for provider ${providerSlug} on runner ${runner.id}`
            );
          }
          return {
            id: runner.id,
            name: runner.name,
            price: withVariance(baseOdds),
          };
        }),
      },
    ],
  }));

  return {
    generatedAt: new Date(now).toISOString(),
    events: events as ProviderOddsPayload["events"],
  };
}

function createFixtureEndpoint(
  providerSlug: string,
  displayName: string
): ProviderEndpoint {
  return {
    id: providerSlug,
    name: displayName,
    slug: providerSlug,
    url: `fixture://${providerSlug}`,
    oddsFormat: "decimal",
    fetcher: () => buildPayload(providerSlug),
  };
}

export function createFixtureEndpoints(): ProviderEndpoint[] {
  return [
    createFixtureEndpoint("fixture-alpha", "Fixture Alpha"),
    createFixtureEndpoint("fixture-beta", "Fixture Beta"),
  ];
}
