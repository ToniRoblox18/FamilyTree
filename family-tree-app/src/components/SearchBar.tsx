import { useState, useMemo } from 'react';
import Fuse from 'fuse.js';
import type { Person } from '../types';
import { useTreeStore } from '../store';

interface SearchBarProps {
    onResultSelect: (personId: string) => void;
    style?: React.CSSProperties;
    className?: string;
}

export function SearchBar({ onResultSelect, style, className }: SearchBarProps) {
    const [query, setQuery] = useState('');
    const [showResults, setShowResults] = useState(false);
    const { familyData, expandPath, highlightNode } = useTreeStore();

    const fuse = useMemo(() => {
        if (!familyData) return null;
        const persons = Object.values(familyData.allPersons);
        return new Fuse(persons, {
            keys: ['name', 'nameVN', 'alias', 'houseName'],
            threshold: 0.3,
            includeMatches: true,
        });
    }, [familyData]);

    const results = useMemo(() => {
        if (!familyData || query.length < 2) return [];

        // Check for Regex mode (starts with /)
        if (query.startsWith('/')) {
            try {
                // Extract pattern and flags
                const match = query.match(/^\/(.+)\/([a-z]*)$/);
                const pattern = match ? match[1] : query.slice(1);
                const flags = match ? match[2] : 'i'; // default to case-insensitive if not specified

                const regex = new RegExp(pattern, flags);
                const allPersons = Object.values(familyData.allPersons);

                return allPersons
                    .filter(p =>
                        regex.test(p.name) ||
                        (p.nameVN && regex.test(p.nameVN)) ||
                        (p.alias && p.alias.some(a => regex.test(a))) ||
                        (p.houseName && regex.test(p.houseName))
                    )
                    .map(item => ({ item, matches: [], score: 0 })) // Mimic Fuse result structure
                    .slice(0, 10);
            } catch (e) {
                // Invalid regex, fall back to empty
                return [];
            }
        }

        if (!fuse) return [];
        return fuse.search(query).slice(0, 10);
    }, [fuse, query, familyData]);

    const getPathToRoot = (personId: string): string[] => {
        if (!familyData) return [];
        const path: string[] = [];
        let current = familyData.allPersons[personId];
        while (current) {
            path.push(current.id);
            if (current.parentId) {
                current = familyData.allPersons[current.parentId];
            } else {
                break;
            }
        }
        return path;
    };

    const handleSelect = (person: Person) => {
        const path = getPathToRoot(person.id);
        expandPath(path);
        highlightNode(person.id);
        onResultSelect(person.id);
        setQuery('');
        setShowResults(false);
    };

    return (
        <div
            className={className}
            style={{
                position: 'relative',
                width: '300px',
                zIndex: 1000,
                ...style
            }}
        >
            <input
                type="text"
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                placeholder="Search..."
                style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '14px',
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                }}
            />

            {showResults && results.length > 0 && (
                <div style={{
                    marginTop: '8px',
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                    maxHeight: '300px',
                    overflowY: 'auto',
                }}>
                    {results.map((result) => (
                        <div
                            key={result.item.id}
                            onClick={() => handleSelect(result.item)}
                            style={{
                                padding: '12px 16px',
                                cursor: 'pointer',
                                borderBottom: '1px solid rgba(0,0,0,0.1)',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(20, 184, 166, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                                {result.item.name}
                            </div>
                            {result.item.nameVN && (
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                    {result.item.nameVN}
                                </div>
                            )}
                            {result.item.houseName && (
                                <div style={{ fontSize: '11px', color: '#888' }}>
                                    TênNhà: {result.item.houseName}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
