import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  clearMessagesRecord,
  clearRendersRecord,
  deleteItemRecord,
  deleteOutfitRecord,
  deletePersonaRecord,
  deleteRenderRecord,
  insertItem,
  insertMessage,
  insertOutfit,
  insertPersona,
  insertRender,
  listItems,
  listMessages,
  listOutfits,
  listPersonas,
  listRenders,
  updateItemRecord,
  updateOutfitRecord,
  wipeDatabase,
} from './db';
import { deleteImageFiles } from './files';
import { newId } from './id';
import type {
  ChatMessage,
  Item,
  Outfit,
  OutfitSuggestion,
  Persona,
  Render,
} from './types';

type NewItem = Omit<Item, 'id' | 'createdAt'>;
type NewOutfit = { name: string; itemIds: string[]; note?: string };
type NewPersona = Omit<Persona, 'id' | 'createdAt'>;

interface LibraryValue {
  ready: boolean;
  initError: string | null;
  retry: () => Promise<void>;
  items: Item[];
  outfits: Outfit[];
  personas: Persona[];
  renders: Render[];
  messages: ChatMessage[];
  addItem: (input: NewItem) => Promise<Item>;
  editItem: (item: Item) => Promise<void>;
  removeItem: (item: Item) => Promise<void>;
  addOutfit: (input: NewOutfit) => Promise<Outfit>;
  editOutfit: (outfit: Outfit) => Promise<void>;
  removeOutfit: (outfit: Outfit) => Promise<void>;
  addPersona: (input: NewPersona) => Promise<Persona>;
  removePersona: (persona: Persona) => Promise<void>;
  addRender: (input: Omit<Render, 'id' | 'createdAt'>) => Promise<Render>;
  removeRender: (render: Render) => Promise<void>;
  addMessage: (input: Omit<ChatMessage, 'id' | 'createdAt'>) => Promise<ChatMessage>;
  addSuggestionMessage: (
    text: string,
    suggestion: OutfitSuggestion | undefined,
    tip?: string,
  ) => Promise<ChatMessage>;
  clearChat: () => Promise<void>;
  clearLookbook: () => Promise<void>;
  resetAll: () => Promise<void>;
}

const LibraryContext = createContext<LibraryValue | null>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [renders, setRenders] = useState<Render[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const started = useRef(false);

  const load = useCallback(async () => {
    setReady(false);
    setInitError(null);
    try {
      const [nextItems, nextOutfits, nextPersonas, nextRenders, nextMessages] =
        await Promise.all([
          listItems(),
          listOutfits(),
          listPersonas(),
          listRenders(),
          listMessages(),
        ]);
      setItems(nextItems);
      setOutfits(nextOutfits);
      setPersonas(nextPersonas);
      setRenders(nextRenders);
      setMessages(nextMessages);
      setReady(true);
    } catch (error) {
      console.error('Failed to open the wardrobe database', error);
      setInitError(error instanceof Error ? error.message : 'The wardrobe could not be opened.');
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    load();
  }, [load]);

  const addItem = useCallback(async (input: NewItem) => {
    const item: Item = { ...input, id: newId('itm'), createdAt: Date.now() };
    await insertItem(item);
    setItems((prev) => [item, ...prev]);
    return item;
  }, []);

  const editItem = useCallback(async (item: Item) => {
    await updateItemRecord(item);
    setItems((prev) => prev.map((current) => (current.id === item.id ? item : current)));
  }, []);

  const removeItem = useCallback(
    async (item: Item) => {
      await deleteItemRecord(item.id);
      await deleteImageFiles(item);
      setItems((prev) => prev.filter((current) => current.id !== item.id));

      const affected = outfits.filter((outfit) => outfit.itemIds.includes(item.id));
      for (const outfit of affected) {
        const next: Outfit = {
          ...outfit,
          itemIds: outfit.itemIds.filter((id) => id !== item.id),
        };
        await updateOutfitRecord(next);
        setOutfits((prev) => prev.map((o) => (o.id === next.id ? next : o)));
      }
    },
    [outfits],
  );

  const addOutfit = useCallback(async (input: NewOutfit) => {
    const outfit: Outfit = {
      id: newId('out'),
      name: input.name.trim() || 'Untitled look',
      itemIds: input.itemIds,
      note: input.note,
      createdAt: Date.now(),
    };
    await insertOutfit(outfit);
    setOutfits((prev) => [outfit, ...prev]);
    return outfit;
  }, []);

  const editOutfit = useCallback(async (outfit: Outfit) => {
    await updateOutfitRecord(outfit);
    setOutfits((prev) => prev.map((current) => (current.id === outfit.id ? outfit : current)));
  }, []);

  const removeOutfit = useCallback(
    async (outfit: Outfit) => {
      await deleteOutfitRecord(outfit.id);
      setOutfits((prev) => prev.filter((current) => current.id !== outfit.id));
      const related = renders.filter((render) => render.outfitId === outfit.id);
      for (const render of related) {
        await deleteRenderRecord(render.id);
        await deleteImageFiles({ uri: render.imageUri });
      }
      setRenders((prev) => prev.filter((render) => render.outfitId !== outfit.id));
    },
    [renders],
  );

  const addPersona = useCallback(async (input: NewPersona) => {
    const persona: Persona = { ...input, id: newId('per'), createdAt: Date.now() };
    await insertPersona(persona);
    setPersonas((prev) => [persona, ...prev]);
    return persona;
  }, []);

  const removePersona = useCallback(async (persona: Persona) => {
    await deletePersonaRecord(persona.id);
    await deleteImageFiles({ uri: persona.imageUri, thumbUri: persona.thumbUri });
    setPersonas((prev) => prev.filter((current) => current.id !== persona.id));
  }, []);

  const addRender = useCallback(async (input: Omit<Render, 'id' | 'createdAt'>) => {
    const render: Render = { ...input, id: newId('rnd'), createdAt: Date.now() };
    await insertRender(render);
    setRenders((prev) => [render, ...prev]);
    return render;
  }, []);

  const removeRender = useCallback(async (render: Render) => {
    await deleteRenderRecord(render.id);
    await deleteImageFiles({ uri: render.imageUri });
    setRenders((prev) => prev.filter((current) => current.id !== render.id));
  }, []);

  const addMessage = useCallback(async (input: Omit<ChatMessage, 'id' | 'createdAt'>) => {
    const message: ChatMessage = { ...input, id: newId('msg'), createdAt: Date.now() };
    await insertMessage(message);
    setMessages((prev) => [...prev, message]);
    return message;
  }, []);

  const addSuggestionMessage = useCallback(
    async (text: string, suggestion: OutfitSuggestion | undefined, tip?: string) => {
      const message: ChatMessage = {
        id: newId('msg'),
        role: 'assistant',
        text,
        suggestion,
        tip,
        createdAt: Date.now(),
      };
      await insertMessage(message);
      setMessages((prev) => [...prev, message]);
      return message;
    },
    [],
  );

  const clearChat = useCallback(async () => {
    await clearMessagesRecord();
    setMessages([]);
  }, []);

  const clearLookbook = useCallback(async () => {
    await clearRendersRecord();
    await Promise.all(renders.map((render) => deleteImageFiles({ uri: render.imageUri })));
    setRenders([]);
  }, [renders]);

  const resetAll = useCallback(async () => {
    await wipeDatabase();
    await Promise.all([
      ...items.map((item) => deleteImageFiles(item)),
      ...personas.map((persona) =>
        deleteImageFiles({ uri: persona.imageUri, thumbUri: persona.thumbUri }),
      ),
      ...renders.map((render) => deleteImageFiles({ uri: render.imageUri })),
    ]);
    setItems([]);
    setOutfits([]);
    setPersonas([]);
    setRenders([]);
    setMessages([]);
  }, [items, personas, renders]);

  const value = useMemo<LibraryValue>(
    () => ({
      ready,
      initError,
      retry: load,
      items,
      outfits,
      personas,
      renders,
      messages,
      addItem,
      editItem,
      removeItem,
      addOutfit,
      editOutfit,
      removeOutfit,
      addPersona,
      removePersona,
      addRender,
      removeRender,
      addMessage,
      addSuggestionMessage,
      clearChat,
      clearLookbook,
      resetAll,
    }),
    [
      ready,
      initError,
      load,
      items,
      outfits,
      personas,
      renders,
      messages,
      addItem,
      editItem,
      removeItem,
      addOutfit,
      editOutfit,
      removeOutfit,
      addPersona,
      removePersona,
      addRender,
      removeRender,
      addMessage,
      addSuggestionMessage,
      clearChat,
      clearLookbook,
      resetAll,
    ],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryValue {
  const value = useContext(LibraryContext);
  if (!value) throw new Error('useLibrary must be used inside LibraryProvider');
  return value;
}
