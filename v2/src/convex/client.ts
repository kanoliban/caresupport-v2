import { ConvexHttpClient } from "convex/browser";

export class ConvexGateway {
  private readonly client: ConvexHttpClient;

  constructor(url: string) {
    this.client = new ConvexHttpClient(url);
  }

  query<T>(name: string, args: Record<string, unknown>): Promise<T> {
    return this.client.query(name as never, args as never) as Promise<T>;
  }

  mutation<T>(name: string, args: Record<string, unknown>): Promise<T> {
    return this.client.mutation(name as never, args as never) as Promise<T>;
  }

  action<T>(name: string, args: Record<string, unknown>): Promise<T> {
    return this.client.action(name as never, args as never) as Promise<T>;
  }
}
