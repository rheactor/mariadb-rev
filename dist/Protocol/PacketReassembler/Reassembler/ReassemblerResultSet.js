import{PacketError as e}from"../../Packet/PacketError.js";import{PacketOk as t}from"../../Packet/PacketOk.js";import{PacketResultSet as s}from"../../Packet/PacketResultSet.js";import{PushRecommendation as r,Reassembler as a}from"./Reassembler.js";export class ReassemblerResultSetPartial extends a{#e;is(s){return!t.is(s)&&!e.is(s)}accept(){}push(e){return t.isEOF(e)?this.#e?t.from(e.subarray(1)).hasMoreResults()?r.MORE_RESULTS:r.DONE:(this.#e=!0,r.INCOMPLETE):(this.packets.push(e),r.INCOMPLETE)}constructor(...e){super(...e),this.packets=[],this.#e=!1}}export class ReassemblerResultSet extends ReassemblerResultSetPartial{get(){return new s(Buffer.concat(this.packets))}}