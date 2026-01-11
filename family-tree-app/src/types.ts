export interface Spouse {
    name: string;
    nameVN?: string;
    childrenIds: string[];
    marriageDate?: string;
    divorceDate?: string;
}

export interface Person {
    id: string;
    generation: number;
    childIndex: string;
    name: string;
    nameVN?: string;
    alias?: string[];
    houseName?: string;
    birthYear?: number;
    deathYear?: number;
    memorialDate?: string;
    religiousName?: string;
    spouses: Spouse[];
    parentId?: string;
}

export interface FamilyData {
    allPersons: Record<string, Person>;
    rootId: string;
}
