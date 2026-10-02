import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ApiError, UNREACHABLE_MESSAGE, apiUrl, fetchWithRetry } from "./api";

describe("api helper", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("joins paths onto the API base", () => {
    expect(apiUrl("/health")).toMatch(/\/health$/);
    expect(apiUrl("health")).toMatch(/\/health$/);
  });

  it("retries once on a network failure then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchWithRetry("http://example.test/health");
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("surfaces a friendly unreachable error after the retry fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }));

    await expect(fetchWithRetry("http://example.test/health")).rejects.toMatchObject({
      name: "ApiError",
      status: 0,
      message: UNREACHABLE_MESSAGE,
    });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it("ApiError is identifiable as unreachable at status 0", () => {
    const error = new ApiError(0, UNREACHABLE_MESSAGE);
    expect(error.status).toBe(0);
  });
});
