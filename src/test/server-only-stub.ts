// Vitest runs outside Next's build, where the real "server-only" package always
// throws (it relies on Next's webpack resolve conditions). Stub it out for tests.
export {};
