import type { Person, Spouse, FamilyData } from './types';

const GENERATION_REGEX = /^\((\d+)\)\s*(\d+[a-z]?)\s+(.+)$/;
const SPOUSE_REGEX = /^&\s+(.+)$/;
const METADATA_REGEX = {
    alias: /^ali\.\s*(.+)$/,
    houseName: /^TênNhà\.\s*(.+)$/,
    nameVN: /^TênVN\.\s*(.+)$/,
    memorialDate: /^NgàyKỵ\.\s*(.+)$/,
    religiousName: /^PhápNm\.\s*(.+)$/,
    marriage: /^m\.\s*(.*)$/,
    divorce: /^div\.\s*(.*)$/,
};

function parseYears(text: string): { birthYear?: number; deathYear?: number } {
    const match = text.match(/\((\d{4}|[<>]?\d{4}|ca\d{4})?\s*-\s*(\d{4}|[<>]?\d{4})?\)/);
    if (!match) return {};

    const parseSingleYear = (s?: string) => {
        if (!s) return undefined;
        const cleaned = s.replace(/[<>ca]/g, '');
        const num = parseInt(cleaned, 10);
        return isNaN(num) ? undefined : num;
    };

    return {
        birthYear: parseSingleYear(match[1]),
        deathYear: parseSingleYear(match[2]),
    };
}

function extractName(text: string): string {
    // Remove years and VN annotations
    return text
        .replace(/\([^)]*\)/g, '')
        .replace(/\s*(VN|né|née)\s+[^\s]+/gi, '')
        .trim();
}

export function parseFamilyTree(text: string): FamilyData {
    const lines = text.split(/\r?\n/);
    const personMap = new Map<string, Person>();

    let currentPerson: Person | null = null;
    let currentSpouse: Spouse | null = null;
    let parentStack: { generation: number; personId: string }[] = [];
    let rootId = '';

    for (const rawLine of lines) {
        let cleanedLine = rawLine.trim();

        // Robustly remove "Created:" headers anywhere in the line or as a full line
        // The previous regex was: /^Created:.*?\d{4}/ which might miss if it's in the middle due to cat/grep issues or formatting
        // Actually, looking at the file, "Created: ..." sometimes appears BEFORE the (generation) marker on the same line.
        // ex: "Created: Saturday, 28 Dec 2024(3) 3b..."
        // We need to strip that prefix if present.
        const createdMatch = cleanedLine.match(/^(Created:.*?\d{4})(.*)$/);
        if (createdMatch) {
            cleanedLine = createdMatch[2].trim();
        }

        if (!cleanedLine || cleanedLine.includes('Descendant Chart')) {
            continue;
        }

        // Check for new person line: (n) index Name
        const personMatch = cleanedLine.match(GENERATION_REGEX);
        if (personMatch) {
            const generation = parseInt(personMatch[1], 10);
            const childIndex = personMatch[2]; // e.g., "1", "5a", "5b"
            const rest = personMatch[3];

            const baseIndexRaw = childIndex.replace(/[a-z]$/, ''); // "1", "5"
            // We keep the full suffix for unique ID generation if needed, but primarily we use it to detect split entries

            // Find parent context
            while (parentStack.length > 0 && parentStack[parentStack.length - 1].generation >= generation) {
                parentStack.pop();
            }
            const parentId = parentStack.length > 0 ? parentStack[parentStack.length - 1].personId : undefined;

            // Unique ID generation strategy:
            // Combine parentId (if exists) + generation + childIndex to be fairly unique.
            // If parentId is missing (root), use 'root'.
            // Note: childIndex includes 'a', 'b' etc. so "5a" and "5b" are distinct IDs initially.
            // BUT: "5a" and "5b" might refer to the SAME person if they are splitting spouses.
            // Logic: If (3) 5a exists, and we see (3) 5b is the same name/person, we merge.

            // However, the file format structure for "5a" and "5b" usually means:
            // (3) 5a Name ... & Spouse1 ... Children...
            // (3) 5b Name ... & Spouse2 ... Children...
            // This is the SAME person. We should treat them as one Person object with multiple spouses.

            // Construct a "canonical" logic ID for the person themselves (ignoring the spouse suffix for identity if possible)
            // But wait, if we have 5a and 5b, they are the same person.
            // Let's use a key that ignores the 'a'/'b' suffix for the Person map, BUT we need to handle the flow carefully.

            const personCanonicalId = parentId
                ? `${parentId}_g${generation}-${baseIndexRaw}`
                : `root_g${generation}-${baseIndexRaw}`;

            const years = parseYears(rest);
            const name = extractName(rest);

            let finalId = personCanonicalId;
            let foundExisting = false;

            // Collision resolution / Differentiate by Name
            // We search for an existing entry (base ID or suffixed ID) that matches the name.
            // If none found, we find the first available unique ID.

            let suffix = 1;
            while (true) {
                const checkId = suffix === 1 ? personCanonicalId : `${personCanonicalId}_${suffix}`;

                if (personMap.has(checkId)) {
                    const existing = personMap.get(checkId)!;
                    const name1 = existing.name.toLowerCase().replace(/\s+/g, '');
                    const name2 = name.toLowerCase().replace(/\s+/g, '');

                    if (name1 === name2) {
                        // Found existing person entry
                        finalId = checkId;
                        foundExisting = true;
                        break;
                    }
                    // Name doesn't match, this ID is taken by someone else. Try next suffix.
                    suffix++;
                } else {
                    // ID is free. This is a new person (or new collision entry).
                    finalId = checkId;
                    foundExisting = false;
                    break;
                }
            }

            if (foundExisting) {
                currentPerson = personMap.get(finalId)!;
                currentSpouse = null;
                parentStack.push({ generation, personId: finalId });
            } else {
                const newPerson: Person = {
                    id: finalId,
                    generation,
                    childIndex: childIndex, // store original index e.g. "5a"
                    name: name,
                    ...years,
                    spouses: [],
                    parentId,
                };

                personMap.set(finalId, newPerson);
                currentPerson = newPerson;
                currentSpouse = null;

                if (generation === 1 && !rootId) {
                    rootId = finalId;
                }

                // Link this new person to their parent
                if (parentId) {
                    const parent = personMap.get(parentId);
                    // CRITICAL: We need to figure out WHICH spouse of the parent this child belongs to.
                    // The file format implies children follow the spouse immediately.
                    // So we attach to the *last added* spouse of the parent.
                    if (parent && parent.spouses.length > 0) {
                        const lastSpouse = parent.spouses[parent.spouses.length - 1];
                        // Avoid duplicates in children list
                        if (!lastSpouse.childrenIds.includes(finalId)) {
                            lastSpouse.childrenIds.push(finalId);
                        }
                    } else if (parent) {
                        // Fallback: Parent has no recorded spouse? (Unlikely in this format but possible)
                        // Should we create a "Unknown" spouse? Or just leave it?
                        // For now, if no spouse exists, we can't attach to a spouse. 
                        // But usually '& Spouse' comes before children.
                        // Exception: (1) 1 Giao ... (no parent).
                    }
                }

                parentStack.push({ generation, personId: finalId });
            }
            continue;
        }

        // Check for spouse line: & Name
        const spouseMatch = cleanedLine.match(SPOUSE_REGEX);
        if (spouseMatch && currentPerson) {
            const spouseText = spouseMatch[1];
            currentSpouse = {
                name: extractName(spouseText),
                childrenIds: [],
            };
            currentPerson.spouses.push(currentSpouse);
            continue;
        }

        // Check for metadata lines
        if (currentPerson) {
            for (const [key, regex] of Object.entries(METADATA_REGEX)) {
                const match = cleanedLine.match(regex);
                if (match) {
                    const value = match[1]?.trim() || '';
                    switch (key) {
                        case 'alias':
                            currentPerson.alias = currentPerson.alias || [];
                            currentPerson.alias.push(value);
                            break;
                        case 'houseName':
                            currentPerson.houseName = value;
                            break;
                        case 'nameVN':
                            // If currentSpouse is active, it belongs to the spouse
                            if (currentSpouse) {
                                currentSpouse.nameVN = value;
                            } else {
                                currentPerson.nameVN = value;
                            }
                            break;
                        case 'memorialDate':
                            currentPerson.memorialDate = value;
                            break;
                        case 'religiousName':
                            currentPerson.religiousName = value;
                            break;
                        case 'marriage':
                            // "m. Jan 2011"
                            if (currentSpouse) {
                                currentSpouse.marriageDate = value;
                            }
                            break;
                        case 'divorce':
                            // "div. 2010"
                            if (currentSpouse) {
                                currentSpouse.divorceDate = value;
                            }
                            break;
                    }
                    break;
                }
            }
        }
    }

    const allPersons: Record<string, Person> = {};
    personMap.forEach((person, id) => {
        allPersons[id] = person;
    });

    return { allPersons, rootId };
}
