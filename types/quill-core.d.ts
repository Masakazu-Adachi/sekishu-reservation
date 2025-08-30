declare module "quill/core" {
  export interface DeltaOperation {
    insert?: unknown;
    delete?: number;
    retain?: number;
    attributes?: Record<string, unknown>;
    [key: string]: unknown;
  }
}
