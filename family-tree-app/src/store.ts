import { create } from 'zustand';
import type { FamilyData } from './types';

interface TreeStore {
    familyData: FamilyData | null;
    expandedNodes: Set<string>;
    highlightedNode: string | null;
    setFamilyData: (data: FamilyData) => void;
    toggleNode: (id: string) => void;
    expandPath: (ids: string[]) => void;
    highlightNode: (id: string | null) => void;
    isExpanded: (id: string) => boolean;
    toggleGeneration: (generation: number, expand: boolean) => void;
    backgroundColor: string;
    setBackgroundColor: (color: string) => void;
}

export const useTreeStore = create<TreeStore>((set, get) => ({
    familyData: null,
    expandedNodes: new Set<string>(),
    highlightedNode: null,
    backgroundColor: 'linear-gradient(to right, #434343 0%, #000000 100%)',

    setBackgroundColor: (color: string) => set({ backgroundColor: color }),

    setFamilyData: (data) => {
        // Initially expand ALL nodes
        const initialExpanded = new Set<string>();
        Object.values(data.allPersons).forEach((person) => {
            initialExpanded.add(person.id);
        });
        set({ familyData: data, expandedNodes: initialExpanded });
    },

    toggleNode: (id) => {
        const { expandedNodes } = get();
        const newSet = new Set(expandedNodes);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        set({ expandedNodes: newSet });
    },

    toggleGeneration: (generation: number, expand: boolean) => {
        const { familyData, expandedNodes } = get();
        if (!familyData) return;

        const newSet = new Set(expandedNodes);
        Object.values(familyData.allPersons).forEach((person) => {
            if (person.generation === generation) {
                if (expand) {
                    newSet.add(person.id);
                } else {
                    newSet.delete(person.id);
                }
            }
        });
        set({ expandedNodes: newSet });
    },

    expandPath: (ids) => {
        const { expandedNodes } = get();
        const newSet = new Set(expandedNodes);
        ids.forEach((id) => newSet.add(id));
        set({ expandedNodes: newSet });
    },

    highlightNode: (id) => {
        set({ highlightedNode: id });
        if (id) {
            setTimeout(() => set({ highlightedNode: null }), 2000);
        }
    },

    isExpanded: (id) => get().expandedNodes.has(id),
}));
