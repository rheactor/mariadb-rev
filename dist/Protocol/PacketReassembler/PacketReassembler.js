var e,s;import{PacketError as t}from"../Packet/PacketError.js";import{PacketOk as a}from"../Packet/PacketOk.js";import{PushRecommendation as r}from"./Reassembler/Reassembler.js";(s=e||(e={}))[s.PENDING=0]="PENDING",s[s.INCOMPATIBLE=1]="INCOMPATIBLE",s[s.ACCEPTED=2]="ACCEPTED";export class PacketReassembler{#e;#s;#t;#a;#r;#i;constructor(s,t){this.#e=void 0,this.#s=e.PENDING,this.#a=void 0,this.#r=void 0,this.#i=[],this.#t=s,void 0!==t&&(this.#a=t,this.#r=new t)}push(s){for(this.#e=void 0===this.#e?s:Buffer.concat([this.#e,s]);this.#e.length>=4;){let s=this.#e.readUIntLE(0,3)+4;if(this.#e.length<s)break;let i=this.#e.subarray(4,s);if(this.#r&&(this.#s===e.PENDING&&(this.#r.is(i)?(this.#s=e.ACCEPTED,this.#r.accept(i)):this.#s=e.INCOMPATIBLE),this.#s===e.ACCEPTED)){let t=this.#r.push(i);if(t===r.MORE_RESULTS)this.#i.push(this.#r.get()),this.#s=e.PENDING,this.#r=new this.#a;else if(t===r.DONE){this.#i.push(this.#r.get()),this.#t(this.#i);return}this.#e=this.#e.subarray(s);continue}if(t.is(i)){this.#t(this.#i,t.from(i.subarray(1)));return}if(a.is(i)){let t=a.from(i.subarray(1));if(this.#i.push(t),t.hasMoreResults()){this.#s=e.PENDING,this.#e=this.#e.subarray(s);continue}this.#t(this.#i);return}throw Error("malformed packet")}}}