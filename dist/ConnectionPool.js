import{Connection as t}from"./Connection.js";import{removeItem as i}from"./Utils/ArrayUtil.js";import{TimerUtil as n}from"./Utils/TimerUtil.js";export class ConnectionPool{#t;#i;#n;#e;constructor(t){this.#t=new Map,this.#i=[],this.#n=[],this.#e={host:"localhost",port:3306,user:"root",connections:20,idleTimeout:6e4,idleConnections:void 0===t.connections?10:Math.max(1,Math.floor(t.connections/2)),...t};for(let t=0;t<this.#e.idleConnections;t++)this.#s()}get debug(){return{connectionsCount:this.#t.size,idleConnectionsCount:this.#i.length,acquisitionQueueSize:this.#n.length}}async acquire(t,i={}){let n=this.#i.pop();return void 0===n?!0===i.immediate&&(void 0===this.#e.connectionsHardLimit||this.#t.size<this.#e.connectionsHardLimit)||this.#t.size<this.#e.connections?this.#o(t,this.#s()):new Promise(n=>{this.#n.push({options:i,acquireCallback:t,resolve:n})}):!0===i.renew&&n.wasUsed?n.reset().then(async()=>this.#o(t,this.#s())):this.#o(t,n)}async queryRaw(t,i){return this.acquire(async n=>n.queryRaw(t,i))}async query(t,i){return this.acquire(async n=>n.query(t,i))}async execute(t,i){return this.acquire(async n=>n.execute(t,i))}async batchQueryRaw(t){return this.acquire(async i=>i.batchQueryRaw(t))}async batchQuery(t){return this.acquire(async i=>i.batchQuery(t))}async batchExecute(t){return this.acquire(async i=>i.batchExecute(t))}async close(){return Promise.all([...this.#t.keys()].map(async t=>t.close()))}#s(){let e=this,s=new t({host:this.#e.host,port:this.#e.port,user:this.#e.user,password:this.#e.password,database:this.#e.database,async afterAuthenticated(){return e.#e.afterAuthenticated?.apply(this)}}),o=new n(()=>{this.#i.length>this.#e.idleConnections&&s.close()},this.#e.idleTimeout);return this.#t.set(s,o),this.#i.push(s),s.once("closed",()=>{o.stop(),this.#t.delete(s),i(this.#i,s)}),s}async #o(t,n){let e=this.#t.get(n);return e.stop(),i(this.#i,n),t(n).finally(async()=>{if(this.#t.size>this.#e.connections){n.close();return}this.#i.push(n),e.restart();let t=this.#n.shift();if(void 0!==t){let i=await this.acquire(t.acquireCallback,t.options);t.resolve(i)}})}}