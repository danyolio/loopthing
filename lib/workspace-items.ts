export const itemCollections = {
  source: "sources",
  question: "questions",
  decision: "decisions",
  comment: "comments",
  branch: "branches",
} as const;

export type ItemKind = keyof typeof itemCollections;
export type ItemCollection = (typeof itemCollections)[ItemKind];

export function collectionForItemKind(kind: ItemKind): ItemCollection {
  return itemCollections[kind];
}

export function itemKindForCollection(
  collection: ItemCollection,
): ItemKind {
  const match = Object.entries(itemCollections).find(
    ([, value]) => value === collection,
  );

  if (!match) {
    throw new Error(`Unsupported workspace collection: ${collection}`);
  }

  return match[0] as ItemKind;
}
