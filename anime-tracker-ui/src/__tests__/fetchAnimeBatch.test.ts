import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchAnimeBatch } from "@/lib/fetchAnimeBatch";

/** Answers each request with an entry per id it was sent. */
function stubBatchEndpoint() {
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const { ids } = JSON.parse(String(init.body)) as { ids: number[] };
    return {
      ok: true,
      json: async () => ({
        data: Object.fromEntries(
          ids.map((id) => [id, { title: `Anime ${id}`, images: { poster: null } }]),
        ),
      }),
    };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const sentIds = (mock: ReturnType<typeof stubBatchEndpoint>) =>
  mock.mock.calls.map(([, init]) => JSON.parse(String(init.body)).ids as number[]);

beforeEach(() => vi.restoreAllMocks());

describe("fetchAnimeBatch", () => {
  it("never sends more ids than the endpoint accepts", async () => {
    // The route rejects more than fifty. Sending them all at once came back as
    // a 400 and an empty map, which collections showed as a load error.
    const mock = stubBatchEndpoint();
    const ids = Array.from({ length: 120 }, (_, i) => i + 1);

    const result = await fetchAnimeBatch(ids);

    expect(sentIds(mock).map((chunk) => chunk.length)).toEqual([50, 50, 20]);
    expect(result.size).toBe(120);
  });

  it("keeps what the other chunks returned when one fails", async () => {
    const mock = stubBatchEndpoint();
    mock.mockImplementationOnce(async () => ({ ok: false, json: async () => ({}) }) as never);
    const ids = Array.from({ length: 60 }, (_, i) => i + 1);

    const result = await fetchAnimeBatch(ids);

    // One chunk of fifty lost, the other ten intact.
    expect(result.size).toBe(10);
  });

  it("asks for each id once", async () => {
    const mock = stubBatchEndpoint();

    await fetchAnimeBatch([1, 2, 2, 3, 1]);

    expect(sentIds(mock)).toEqual([[1, 2, 3]]);
  });
});
