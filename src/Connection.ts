import { Socket } from "node:net";

import { Handshake } from "@/Protocol/Handshake/Handshake";
import { createHandshakeResponse } from "@/Protocol/Handshake/HandshakeResponse";
import { Packet } from "@/Protocol/Packet/Packet";
import { PacketError } from "@/Protocol/Packet/PacketError";
import { PacketOk } from "@/Protocol/Packet/PacketOk";
import {
  PreparedStatementResponse,
  type ExecuteArgument as QueryArgument,
} from "@/Protocol/PreparedStatement/PreparedStatementResponse";
import { PreparedStatementResultSet } from "@/Protocol/PreparedStatement/PreparedStatementResultSet";
import { EventEmitter } from "@/Utils/EventEmitter";

const enum Status {
  CONNECTING,
  AUTHENTICATING,
  READY,
  EXECUTING,
  ERROR,
}

export interface ConnectionOptions {
  /** Connection host. Default is "localhost". */
  host: string;

  /** Connection port number. Default is 3306. */
  port: number;

  /** Connection user. Default is "root". */
  user: string;

  /** Connection password. Default is empty. */
  password?: string;

  /** Connection database. Default is none. */
  database: string;
}

type ConnectionEventsError = "error";

type ConnectionEventsCommon =
  | "authenticated"
  | "authenticating"
  | "closed"
  | "connected";

interface ConnectionCommand {
  buffer: Buffer;
  sequence: number;
  resolve(data: Buffer): void;
}

abstract class ConnectionEvents {
  private readonly eventsEmitter = new EventEmitter();

  public on(
    eventName: ConnectionEventsError,
    listener: (connection: Connection, error: Error) => void
  ): void;

  public on(
    eventName: ConnectionEventsCommon,
    listener: (connection: Connection) => void
  ): void;

  public on(
    eventName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listener: (...args: any[]) => void
  ): void {
    this.eventsEmitter.on(eventName, listener);
  }

  public once(
    eventName: ConnectionEventsError,
    listener: (connection: Connection, error: Error) => void
  ): void;

  public once(
    eventName: ConnectionEventsCommon,
    listener: (connection: Connection) => void
  ): void;

  public once(
    eventName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listener: (...args: any[]) => void
  ): void {
    this.eventsEmitter.once(eventName, listener);
  }

  public emit(
    eventName: ConnectionEventsCommon | ConnectionEventsError,
    ...args: Parameters<EventEmitter["emit"]>[1]
  ): void {
    this.eventsEmitter.emit(eventName, ...args);
  }
}

export class Connection extends ConnectionEvents {
  public status: Status = Status.CONNECTING;

  public initialHandshake?: Handshake;

  private connected = false;

  private readonly commands: ConnectionCommand[] = [];

  private readonly socket: Socket;

  private readonly options: ConnectionOptions;

  public constructor(
    options: Partial<ConnectionOptions> & Pick<ConnectionOptions, "database">
  ) {
    super();

    this.options = {
      host: "localhost",
      port: 3306,
      user: "root",
      ...options,
    };

    const socket = new Socket();

    socket.once("connect", () => {
      this.connected = true;
      this.emit("connected", this);
    });

    socket.once("data", (data) => {
      this.processResponse(data);
    });

    socket.once("error", (err) => {
      this.status = Status.ERROR;
      this.emit("error", this, err);
    });

    socket.once("close", () => {
      this.emit("closed", this);
    });

    socket.connect(this.options.port, this.options.host);

    this.socket = socket;
  }

  public isConnected() {
    return this.connected;
  }

  public isError() {
    return this.status === Status.ERROR;
  }

  public isAuthenticating() {
    return this.status === Status.AUTHENTICATING;
  }

  public isAuthenticated() {
    return this.status === Status.READY;
  }

  public async ping() {
    return this.commandQueue(Buffer.from([0x0e])).then((data) =>
      Packet.fromResponse(data)
    );
  }

  public async queryDetailed(sql: string, args?: QueryArgument[]) {
    if (args !== undefined && args.length > 0) {
      return this.commandQueue(Buffer.from(`\x16${sql}`)).then(
        async (packet) => {
          if (PacketError.is(packet)) {
            return Packet.fromResponse(packet);
          }

          return new PreparedStatementResultSet(
            await this.commandQueue(
              new PreparedStatementResponse(packet).execute(args),
              true
            )
          );
        }
      );
    }

    return this.commandQueue(Buffer.from(`\x03${sql}`)).then((data) =>
      Packet.fromResponse(data)
    );
  }

  public async close() {
    if (this.connected) {
      await this.commandQueue(Buffer.from([0x01]));
    }

    this.socket.end();
  }

  private async commandQueue(buffer: Buffer, prioritize = false, sequence = 0) {
    return new Promise<Buffer>((resolve) => {
      if (prioritize) {
        this.commands.unshift({ buffer, resolve, sequence });
      } else {
        this.commands.push({ buffer, resolve, sequence });
      }

      this.commandRun();
    });
  }

  private commandRun() {
    if (this.status === Status.READY) {
      const command = this.commands.shift();

      if (!command) {
        return;
      }

      this.status = Status.EXECUTING;

      this.socket.once("data", (data) => {
        this.status = Status.READY;

        command.resolve(data);

        this.commandRun();
      });

      this.socket.write(Packet.from(command.buffer, command.sequence));
    }
  }

  private processResponse(data: Buffer) {
    const initialHandshakePacket = new Packet(data);

    this.initialHandshake = new Handshake(initialHandshakePacket.body);

    this.socket.once("data", (serverData) => {
      const serverResponse = Packet.fromResponse(serverData) as
        | PacketError
        | PacketOk;

      if (serverResponse instanceof PacketOk) {
        this.status = Status.READY;
        this.emit("authenticated", this);
        this.commandRun();
      } else {
        this.status = Status.ERROR;
        this.emit(
          "error",
          this,
          new Error(serverResponse.message, {
            cause: serverResponse,
          })
        );
        this.close();
      }
    });

    const handshakeResponse = Packet.from(
      createHandshakeResponse(
        this.initialHandshake.authSeed,
        this.initialHandshake.authPluginName,
        this.options.user,
        this.options.password ?? "",
        this.options.database,
        0xffffffff
      ),
      initialHandshakePacket.sequence + 1
    );

    this.status = Status.AUTHENTICATING;
    this.emit("authenticating", this);

    this.socket.write(handshakeResponse);
  }
}
