var t,e,s,r;import{Socket as n}from"node:net";import{ConnectionException as o}from"./Exceptions/ConnectionException.js";import{FewArgumentsException as i}from"./Exceptions/FewArgumentsException.js";import{QueryException as a}from"./Exceptions/QueryException.js";import{TooManyArgumentsException as c}from"./Exceptions/TooManyArgumentsException.js";import{expectedOKPacket as h,expectedResultSetPacket as m}from"./Exceptions/UnexpectedResponseTypeException.js";import{Handshake as u}from"./Protocol/Handshake/Handshake.js";import{createHandshakeResponse as f}from"./Protocol/Handshake/HandshakeResponse.js";import{createPacket as d}from"./Protocol/Packet/Packet.js";import{PacketError as l}from"./Protocol/Packet/PacketError.js";import{PacketOk as E}from"./Protocol/Packet/PacketOk.js";import{PacketResultSet as R}from"./Protocol/Packet/PacketResultSet.js";import{PacketReassembler as p}from"./Protocol/PacketReassembler/PacketReassembler.js";import{ReassemblerPreparedStatementResponse as w}from"./Protocol/PacketReassembler/Reassembler/ReassemblerPreparedStatementResponse.js";import{ReassemblerPreparedStatementResultSet as C}from"./Protocol/PacketReassembler/Reassembler/ReassemblerPreparedStatementResultSet.js";import{ReassemblerResultSet as P}from"./Protocol/PacketReassembler/Reassembler/ReassemblerResultSet.js";import{createClosePacket as A,createExecutePacket as k}from"./Protocol/PreparedStatement/PreparedStatement.js";import{PreparedStatementResultSet as y}from"./Protocol/PreparedStatement/PreparedStatementResultSet.js";import{EventEmitter as T}from"./Utils/EventEmitter.js";(s=t||(t={}))[s.CONNECTING=0]="CONNECTING",s[s.AUTHENTICATING=1]="AUTHENTICATING",s[s.READY=2]="READY",s[s.EXECUTING=3]="EXECUTING",s[s.ERROR=4]="ERROR",(r=e||(e={}))[r.FREE=0]="FREE",r[r.LOCK=1]="LOCK",r[r.RELEASE=2]="RELEASE";class g{constructor(t,s,r,n,o,i=e.FREE){this.buffer=t,this.resolve=s,this.reject=r,this.reassembler=n,this.sequence=o,this.lock=i}}class S{#t;on(t,e){this.#t.on(t,e)}once(t,e){this.#t.once(t,e)}emit(t,...e){this.#t.emit(t,...e)}constructor(){this.#t=new T}}export class Connection extends S{#e;#s;#r;#n;#o;#i;constructor(s){super(),this.status=t.CONNECTING,this.#e=e.FREE,this.#s=!1,this.#r=[[]],this.#i=!1,this.#o={host:"localhost",port:3306,user:"root",...s};let r=new n;r.once("connect",()=>{this.#s=!0,this.emit("connected",this)}),r.once("data",t=>{this.#a(t)}),r.once("error",e=>{this.status=t.ERROR,this.emit("error",this,e)}),r.once("close",()=>{this.emit("closed",this)}),r.connect(this.#o.port,this.#o.host),this.#n=r}get wasUsed(){return this.#i}get currentTransactionCommands(){return this.#r.at(-1)}isConnected(){return this.#s}hasError(){return this.status===t.ERROR}isAuthenticating(){return this.status===t.AUTHENTICATING}hasAuthenticated(){return this.status===t.READY}async ping(){return this.#c(Buffer.from([14])).then(([t])=>t)}async queryRaw(t,s){if(void 0!==s&&s.length>0){if(s.length>65535)throw new c("Prepared Statements supports only 65535 arguments");return this.#c(Buffer.concat([Buffer.from([22]),Buffer.from(t)]),w,0,e.LOCK).catch(t=>{if(t instanceof l)throw new a(t.message).setDetails(t.code,{packetError:t});throw t}).then(async([t])=>{if(t.parametersCount>s.length)throw this.#c(A(t.statementId),!1),new i(`Prepared Statement number of arguments is ${String(t.parametersCount)}, but received ${String(s.length)}`).setDetails(void 0,{required:t.parametersCount,received:s.length});return this.#c(k(t,s),C,0,e.RELEASE).then(([e])=>(this.#c(A(t.statementId),!1),e))})}return this.batchQueryRaw(t).catch(t=>{if(t instanceof l)throw new a(t.message).setDetails(t.code,{packetError:t});throw t}).then(([t])=>t)}async query(t,e){return this.queryRaw(t,e).then(t=>{if(t instanceof R||t instanceof y)return t.getRows();throw m(t)})}async execute(t,e){return this.queryRaw(t,e).catch(t=>{if(t instanceof l)throw new a(t.message).setDetails(t.code,{packetError:t});throw t}).then(t=>{if(t instanceof E)return t;throw h(t)})}async batchQueryRaw(t){return this.#c(Buffer.concat([Buffer.from([3]),Buffer.from(t)]),P)}async batchQuery(t){return this.batchQueryRaw(t).catch(t=>{if(t instanceof l)throw new a(t.message).setDetails(t.code,{packetError:t});throw t}).then(t=>t.map(t=>{if(t instanceof R)return t.getRows();throw m(t)}))}async batchExecute(t){return this.batchQueryRaw(t).catch(t=>{if(t instanceof l)throw new a(t.message).setDetails(t.code,{packetError:t});throw t}).then(t=>t.map(t=>{if(t instanceof E)return t;throw h(t)}))}async transaction(t){let e=this.#r.push([])-2;await this.execute(0===e?"START TRANSACTION":`SAVEPOINT n${String(e)}`);try{let s=await t();await (!1===s?this.execute(0===e?"ROLLBACK":`ROLLBACK TO n${String(e)}`):this.execute(0===e?"COMMIT":`RELEASE SAVEPOINT n${String(e)}`))}catch{await this.execute(0===e?"ROLLBACK":`ROLLBACK TO n${String(e)}`)}this.#r.pop()}async close(){if(!this.#s){this.#n.end();return}return new Promise(t=>{this.#n.once("end",t),this.#c(Buffer.from([1]))})}async reset(){return this.#c(Buffer.from([31])).then(([t])=>t)}async #c(t,s,r=0,n=e.FREE){return new Promise((o,i)=>{let a=new g(t,o,i,s,r,n);n!==e.FREE&&this.#e===e.LOCK?this.#h(a):(this.currentTransactionCommands.push(a),this.#m())})}#m(){if(this.status!==t.READY)return;let e=this.currentTransactionCommands.shift();e&&this.#h(e)}#h(s){s.lock===e.LOCK&&(this.#e=e.LOCK),this.status=t.EXECUTING,this.#i=!0,this.#u(s).finally(()=>{this.status=t.READY,s.lock===e.RELEASE&&(this.#e=e.FREE),s.lock!==e.LOCK&&this.#m()})}async #u(t){if(!1===t.reassembler){this.#n.write(d(t.buffer,t.sequence));return}return new Promise(e=>{let s=new p((s,n)=>{this.#n.off("data",r),void 0===n?t.resolve(s):t.reject(n,s),e()},t.reassembler),r=s.push.bind(s);this.#n.on("data",r),this.#n.write(d(t.buffer,t.sequence))})}#a(e){this.status=t.AUTHENTICATING,this.emit("authenticating",this);let s=new u(e.subarray(4)),r=f(s.authSeed,s.authPluginName,this.#o,4294967295);this.#u(new g(r,async()=>{if(this.status=t.READY,this.emit("authenticated",this),this.#o.afterAuthenticated){let t=this.#r;this.#r=[[]],await this.#o.afterAuthenticated.call(this),this.#i=!1,this.#r.push(...t)}this.#m()},e=>{this.status=t.ERROR,this.emit("error",this,new o(e.message).setDetails(e.code,{packetError:e})),this.close()},void 0,1))}}