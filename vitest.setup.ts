import "@testing-library/jest-dom";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// @ts-expect-error ResizeObserver is not defined in jsdom by default
global.ResizeObserver = ResizeObserverMock;

