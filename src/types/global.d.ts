// Global type declarations for the project

declare global {
  // eslint-disable-next-line no-var
  var __DEV__: boolean;
  
  namespace NodeJS {
    interface Global {
      __DEV__: boolean;
    }
  }
}

// Jest global types are already included via @types/jest
// This file ensures TypeScript recognizes global variables

export {};
