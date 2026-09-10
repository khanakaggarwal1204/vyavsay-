import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
export function createStore(filename=path.join(import.meta.dirname,'../data/feature10.sqlite')) {
 const db=new DatabaseSync(filename);
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS state(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL);
 INSERT OR IGNORE INTO state VALUES(1,'{"proposals":[],"recommendations":[],"reviews":[],"decisions":[],"notifications":[],"commands":[],"handoffs":[]}');
 CREATE TABLE IF NOT EXISTS audit(seq INTEGER PRIMARY KEY,data TEXT NOT NULL);
 CREATE TRIGGER IF NOT EXISTS no_edit_audit BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'Append-only audit'); END;
 CREATE TRIGGER IF NOT EXISTS no_delete_audit BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'Append-only audit'); END;
 CREATE TABLE IF NOT EXISTS immutable(id TEXT PRIMARY KEY,data TEXT NOT NULL);
 CREATE TRIGGER IF NOT EXISTS no_edit_record BEFORE UPDATE ON immutable BEGIN SELECT RAISE(ABORT,'Immutable record'); END;
 CREATE TRIGGER IF NOT EXISTS no_delete_record BEFORE DELETE ON immutable BEGIN SELECT RAISE(ABORT,'Immutable record'); END;
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,actor TEXT NOT NULL,expires INTEGER NOT NULL);`);
 const read=()=>({...JSON.parse(db.prepare('SELECT data FROM state WHERE id=1').get().data),audit:db.prepare('SELECT data FROM audit ORDER BY seq').all().map(r=>JSON.parse(r.data))});
 return {read,transaction(fn){db.exec('BEGIN IMMEDIATE');try{const s=read(),before=JSON.stringify(s.audit),count=s.audit.length,ids=['proposals','recommendations','reviews','decisions'].flatMap(t=>s[t].map(x=>[t,x.id]));const result=fn(s);
 if(JSON.stringify(s.audit.slice(0,count))!==before||ids.some(([t,id])=>!s[t].some(x=>x.id===id)))throw Error('History cannot be removed');
 for(const t of ['proposals','recommendations','reviews','decisions'])for(const row of s[t]){const id=t+':'+row.id,v=JSON.stringify(row),prior=db.prepare('SELECT data FROM immutable WHERE id=?').get(id);if(prior&&prior.data!==v)throw Error('History cannot be overwritten');if(!prior)db.prepare('INSERT INTO immutable VALUES(?,?)').run(id,v);}
 for(const e of s.audit.slice(count))db.prepare('INSERT INTO audit VALUES(?,?)').run(e.seq,JSON.stringify(e));const {audit,...rest}=s;db.prepare('UPDATE state SET data=? WHERE id=1').run(JSON.stringify(rest));db.exec('COMMIT');return result;
 }catch(e){db.exec('ROLLBACK');throw e;}},session(token,actor){db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(token,actor,Date.now()+28800000);},actor(token){return db.prepare('SELECT actor FROM sessions WHERE token=? AND expires>?').get(token||'',Date.now())?.actor;},close(){db.close();}};
}
