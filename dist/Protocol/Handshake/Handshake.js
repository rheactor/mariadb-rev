import{BufferConsumer as t}from"../../Utils/BufferConsumer.js";export class Handshake{constructor(e){let i=new t(e);this.protocolVersion=i.readUInt(),this.serverVersion=i.readNullTerminatedString(),this.connectionId=i.readUInt(4),this.authSeed=i.readString(8,!0),this.capabilities=BigInt(i.readUInt(2)),this.defaultCollation=i.readUInt(),this.serverStatus=i.readUInt(2),this.capabilities+=BigInt(i.readUInt(2))<<16n,this.authPluginNameLength=i.readUInt(),i.skip(6),this.capabilities+=BigInt(i.readUInt(4))<<32n,this.authSeed=Buffer.concat([this.authSeed,i.readString(Math.max(12,this.authPluginNameLength-9),!0)]),this.authPluginName=i.readNullTerminatedString()}}