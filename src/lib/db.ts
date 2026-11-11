import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type {
  Category,
  ChatMessage,
  Item,
  Outfit,
  OutfitSuggestion,
  Persona,
  Render,
} from './types';

let database: Promise<SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLiteDatabase> {
  if (!database) {
    database = initDatabase().catch((error) => {
      database = null;
      throw error;
    });
  }
  return database;
}

async function initDatabase(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync('atelier.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY NOT NULL,
      image_uri TEXT NOT NULL,
      thumb_uri TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      color TEXT,
      brand TEXT,
      notes TEXT,
      source TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outfits (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      item_ids TEXT NOT NULL,
      note TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS personas (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      image_uri TEXT NOT NULL,
      thumb_uri TEXT NOT NULL,
      descriptor TEXT,
      source TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS renders (
      id TEXT PRIMARY KEY NOT NULL,
      outfit_id TEXT NOT NULL,
      persona_id TEXT NOT NULL,
      image_uri TEXT NOT NULL,
      engine TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY NOT NULL,
      role TEXT NOT NULL,
      text TEXT NOT NULL,
      data TEXT,
      created_at INTEGER NOT NULL
    );
  `);
  return db;
}

type Row = Record<string, unknown>;

function parseIds(value: unknown): string[] {
  try {
    const parsed = JSON.parse(String(value ?? '[]'));
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function mapItem(row: Row): Item {
  return {
    id: String(row.id),
    imageUri: String(row.image_uri),
    thumbUri: String(row.thumb_uri),
    name: String(row.name),
    category: String(row.category) as Category,
    color: row.color ? String(row.color) : undefined,
    brand: row.brand ? String(row.brand) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    source: String(row.source) as Item['source'],
    createdAt: Number(row.created_at),
  };
}

function mapOutfit(row: Row): Outfit {
  return {
    id: String(row.id),
    name: String(row.name),
    itemIds: parseIds(row.item_ids),
    note: row.note ? String(row.note) : undefined,
    createdAt: Number(row.created_at),
  };
}

function mapPersona(row: Row): Persona {
  return {
    id: String(row.id),
    name: String(row.name),
    imageUri: String(row.image_uri),
    thumbUri: String(row.thumb_uri),
    descriptor: row.descriptor ? String(row.descriptor) : undefined,
    source: String(row.source) as Persona['source'],
    createdAt: Number(row.created_at),
  };
}

function mapRender(row: Row): Render {
  return {
    id: String(row.id),
    outfitId: String(row.outfit_id),
    personaId: String(row.persona_id),
    imageUri: String(row.image_uri),
    engine: String(row.engine),
    createdAt: Number(row.created_at),
  };
}

function mapMessage(row: Row): ChatMessage {
  let suggestion: OutfitSuggestion | undefined;
  let tip: string | undefined;
  if (row.data) {
    try {
      const data = JSON.parse(String(row.data)) as {
        suggestion?: OutfitSuggestion;
        tip?: string;
      };
      suggestion = data.suggestion;
      tip = data.tip;
    } catch {
      // Old or malformed message payloads simply lose their extras.
    }
  }
  return {
    id: String(row.id),
    role: String(row.role) as ChatMessage['role'],
    text: String(row.text),
    suggestion,
    tip,
    createdAt: Number(row.created_at),
  };
}

export async function listItems(): Promise<Item[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Row>('SELECT * FROM items ORDER BY created_at DESC');
  return rows.map(mapItem);
}

export async function insertItem(item: Item): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO items (id, image_uri, thumb_uri, name, category, color, brand, notes, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.imageUri,
      item.thumbUri,
      item.name,
      item.category,
      item.color ?? null,
      item.brand ?? null,
      item.notes ?? null,
      item.source,
      item.createdAt,
    ],
  );
}

export async function updateItemRecord(item: Item): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE items SET name = ?, category = ?, color = ?, brand = ?, notes = ? WHERE id = ?`,
    [item.name, item.category, item.color ?? null, item.brand ?? null, item.notes ?? null, item.id],
  );
}

export async function deleteItemRecord(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM items WHERE id = ?', [id]);
}

export async function listOutfits(): Promise<Outfit[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Row>('SELECT * FROM outfits ORDER BY created_at DESC');
  return rows.map(mapOutfit);
}

export async function insertOutfit(outfit: Outfit): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO outfits (id, name, item_ids, note, created_at) VALUES (?, ?, ?, ?, ?)`,
    [outfit.id, outfit.name, JSON.stringify(outfit.itemIds), outfit.note ?? null, outfit.createdAt],
  );
}

export async function updateOutfitRecord(outfit: Outfit): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE outfits SET name = ?, item_ids = ?, note = ? WHERE id = ?', [
    outfit.name,
    JSON.stringify(outfit.itemIds),
    outfit.note ?? null,
    outfit.id,
  ]);
}

export async function deleteOutfitRecord(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM outfits WHERE id = ?', [id]);
}

export async function listPersonas(): Promise<Persona[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Row>('SELECT * FROM personas ORDER BY created_at DESC');
  return rows.map(mapPersona);
}

export async function insertPersona(persona: Persona): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO personas (id, name, image_uri, thumb_uri, descriptor, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      persona.id,
      persona.name,
      persona.imageUri,
      persona.thumbUri,
      persona.descriptor ?? null,
      persona.source,
      persona.createdAt,
    ],
  );
}

export async function deletePersonaRecord(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM personas WHERE id = ?', [id]);
}

export async function listRenders(): Promise<Render[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Row>('SELECT * FROM renders ORDER BY created_at DESC');
  return rows.map(mapRender);
}

export async function insertRender(render: Render): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO renders (id, outfit_id, persona_id, image_uri, engine, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [render.id, render.outfitId, render.personaId, render.imageUri, render.engine, render.createdAt],
  );
}

export async function deleteRenderRecord(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM renders WHERE id = ?', [id]);
}

export async function listMessages(): Promise<ChatMessage[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Row>('SELECT * FROM messages ORDER BY created_at ASC');
  return rows.map(mapMessage);
}

export async function insertMessage(message: ChatMessage): Promise<void> {
  const db = await getDatabase();
  const data =
    message.suggestion || message.tip
      ? JSON.stringify({ suggestion: message.suggestion, tip: message.tip })
      : null;
  await db.runAsync(
    `INSERT INTO messages (id, role, text, data, created_at) VALUES (?, ?, ?, ?, ?)`,
    [message.id, message.role, message.text, data, message.createdAt],
  );
}

export async function clearMessagesRecord(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM messages');
}

export async function clearRendersRecord(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM renders');
}

export async function wipeDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM messages;
    DELETE FROM renders;
    DELETE FROM outfits;
    DELETE FROM personas;
    DELETE FROM items;
  `);
}
