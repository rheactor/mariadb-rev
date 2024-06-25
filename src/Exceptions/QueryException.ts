import { Exception } from "@/Exceptions/Exception.js";
import type { PacketError } from "@/Protocol/Packet/PacketError.js";

export class QueryException extends Exception<{ packetError: PacketError }> {}
