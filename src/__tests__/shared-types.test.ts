import { describe, it, expect, expectTypeOf } from "vitest";
import type { AuthStatusResponse, MediaMessage, MessagesApiResponse } from "../../shared/types";

describe("shared type contracts", () => {
  it("MediaMessage contract stays aligned", () => {
    const msg = {
      id: 1,
      date: 1700000000,
      message: "hello",
      mediaType: "photo",
      mimeType: "image/jpeg",
    } satisfies MediaMessage;

    expectTypeOf<MediaMessage["mediaType"]>().toEqualTypeOf<"photo" | "document">();
    expect(msg.mediaType).toBe("photo");
  });

  it("MessagesApiResponse keeps pagination contract", () => {
    const res = {
      messages: [],
      count: 0,
      hasMore: false,
      lastOffsetId: 0,
    } satisfies MessagesApiResponse;

    expectTypeOf<MessagesApiResponse["messages"]>().toEqualTypeOf<MediaMessage[]>();
    expect(typeof res.lastOffsetId).toBe("number");
    expect(res.hasMore).toBe(false);
  });

  it("AuthStatusResponse allows unauthenticated and optional user names", () => {
    const authed = {
      authenticated: true,
      user: { id: 123, first_name: "Test", last_name: "User" },
    } satisfies AuthStatusResponse;

    const unauthed = { authenticated: false } satisfies AuthStatusResponse;

    expectTypeOf<AuthStatusResponse["user"]>().toEqualTypeOf<
      { id: number; first_name: string; last_name?: string } | undefined
    >();
    expect(authed.user.first_name).toBe("Test");
    expect(unauthed.authenticated).toBe(false);
  });
});
