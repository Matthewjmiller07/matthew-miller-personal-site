/// <reference types="astro/client" />

declare global {
  interface Window {
    ProgressEvent: typeof ProgressEvent;
  }
}

export {};
