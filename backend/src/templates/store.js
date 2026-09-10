import { DatabaseSync } from "node:sqlite";
import path from "node:path";

export function createTemplateStore(
  filename = path.join(import.meta.dirname, "../data/templates.sqlite"),
) {
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS state(id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);
    INSERT OR IGNORE INTO state VALUES(1,'{"records":[],"commands":[]}');
    CREATE TABLE IF NOT EXISTS history(seq INTEGER PRIMARY KEY, data TEXT NOT NULL);
    CREATE TRIGGER IF NOT EXISTS history_no_update BEFORE UPDATE ON history BEGIN SELECT RAISE(ABORT,'History is append only'); END;
    CREATE TRIGGER IF NOT EXISTS history_no_delete BEFORE DELETE ON history BEGIN SELECT RAISE(ABORT,'History is append only'); END;
    CREATE TABLE IF NOT EXISTS evidence(id TEXT PRIMARY KEY, data BLOB NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, actor TEXT NOT NULL, expires INTEGER NOT NULL);`);
  const read = () =>
    JSON.parse(db.prepare("SELECT data FROM state WHERE id=1").get().data);
  return {
    read,
    history(id) {
      return db
        .prepare("SELECT data FROM history ORDER BY seq")
        .all()
        .map((r) => JSON.parse(r.data))
        .filter((r) => r.record.id === id);
    },
    transaction(fn) {
      db.exec("BEGIN IMMEDIATE");
      try {
        const state = read();
        const result = fn(state, {
          append(event) {
            db.prepare("INSERT INTO history(data) VALUES(?)").run(
              JSON.stringify(event),
            );
          },
          upload(id, bytes) {
            db.prepare("INSERT INTO evidence VALUES(?,?)").run(id, bytes);
          },
        });
        db.prepare("UPDATE state SET data=? WHERE id=1").run(
          JSON.stringify(state),
        );
        db.exec("COMMIT");
        return result;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
    evidence(id) {
      return db.prepare("SELECT data FROM evidence WHERE id=?").get(id)?.data;
    },
    session(token, actor) {
      db.prepare("DELETE FROM sessions WHERE expires<=?").run(Date.now());
      db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
        token,
        actor,
        Date.now() + 28800000,
      );
    },
    actor(token) {
      return db
        .prepare("SELECT actor FROM sessions WHERE token=? AND expires>?")
        .get(token || "", Date.now())?.actor;
    },
    logout(token) {
      db.prepare("DELETE FROM sessions WHERE token=?").run(token || "");
    },
    close() {
      db.close();
    },
  };
}
