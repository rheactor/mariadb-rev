import { type PacketError } from "@/Protocol/Packet/PacketError";

export class QueryError extends Error {
  public cause!: PacketError;
}
