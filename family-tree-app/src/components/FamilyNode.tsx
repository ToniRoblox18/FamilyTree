import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useTreeStore } from '../store';

const GENERATION_COLORS: Record<number, string> = {
    1: '#1e3a5f',
    2: '#3b82a0',
    3: '#14b8a6',
    4: '#f59e0b',
    5: '#f43f5e',
};

export type FamilyNodeData = {
    name: string;
    nameVN?: string;
    houseName?: string;
    birthYear?: number;
    deathYear?: number;
    generation: number;
    hasChildren: boolean;
    personId: string;
    spouses?: { name: string; marriageDate?: string; divorceDate?: string }[];
};

export type FamilyNodeType = Node<FamilyNodeData, 'family'>;

function FamilyNodeComponent({ data }: NodeProps<FamilyNodeType>) {
    const { toggleNode, isExpanded, highlightedNode } = useTreeStore();
    const isHighlighted = highlightedNode === data.personId;
    const expanded = isExpanded(data.personId);

    const bgColor = GENERATION_COLORS[data.generation] || '#6b7280';

    const lifespan = data.birthYear || data.deathYear
        ? `${data.birthYear || '?'} – ${data.deathYear || ''}`
        : '';

    // Find relevant marriage info (if this node is a spouse to someone, or has spouses)
    // Actually, marriage info is usually on the spouse edge or stored in the spouse object.
    // But here we are rendering a person. 
    // The parser assigns marriageDate to the "currentSpouse" object. 
    // BUT the node represents a Person, which has a list of Spouses.
    // If we want to show who they married and when, it's complex because they might have multiple spouses.
    // The user request says: "1a. Đặng Hiếu Trung hat Phan Hồng-Vân geheiratet... geschieden... 1b. ... geheiratet"
    // So for a person with spouses, we might want to list them?
    // OR, if the node represents the SPOUSE themselves (in the tree, do we explicitly show spouses as nodes?)
    // In the current logic, `getLayoutedElements` iterates `visiblePersons`.
    // It creates nodes for *Persons*. Children are connected.
    // Spouses are NOT distinct nodes in the current visualization? 
    // Wait, let's check `getLayoutedElements` in `FamilyTree.tsx`.
    // -> `dagreGraph.setNode(person.id ...)`
    // -> `nodes.push(...)`
    // -> `person.spouses.forEach(spouse => spouse.childrenIds.forEach(childId => ... dagreGraph.setEdge...))`
    // This implies Spouses are NOT shown as separate nodes! They are implicit in the edges to children?
    // Or maybe the spouse Name is shown *inside* the Person node?
    // Let's check `FamilyNodeComponent` rendering. 
    // It shows `data.name`, `data.nameVN`, `lifespan`, `houseName`.
    // It does NOT show spouses. This is a flaw if we want to show "Married X in 2010".

    // I need to update `FamilyNode` to list spouses and their dates if available.

    // Filter out divorced spouses
    const activeSpouses = (data.spouses || []).filter(spouse => !spouse.divorceDate);

    const spousesInfo = activeSpouses.map(spouse => {
        let text = spouse.name;
        if (spouse.marriageDate) text += ` (m. ${spouse.marriageDate})`;
        // Divorce date check redundant here due to filter, but safe
        return text;
    });

    return (
        <div
            className={`family-node ${isHighlighted ? 'ping' : ''}`}
            style={{
                backgroundColor: bgColor,
                width: 180, // Reduced width
                padding: '8px', // Reduced padding
                borderRadius: '8px',
                color: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                fontSize: '12px', // Base font size reduced
            }}
        >
            <Handle type="target" position={Position.Left} style={{ background: '#555' }} />

            <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '2px' }}>
                {data.name}
            </div>

            {data.nameVN && (
                <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '2px', fontStyle: 'italic' }}>
                    {data.nameVN}
                </div>
            )}

            <div style={{ fontSize: '10px', opacity: 0.8, marginBottom: '4px' }}>
                {lifespan}
                {data.houseName && ` • ${data.houseName}`}
            </div>

            {/* Render Spouses info */}
            {spousesInfo.length > 0 && (
                <div style={{
                    marginTop: '4px',
                    paddingTop: '4px',
                    borderTop: '1px solid rgba(255,255,255,0.2)',
                    fontSize: '10px'
                }}>
                    {spousesInfo.map((info, i) => (
                        <div key={i} style={{ marginBottom: '1px' }}>♥ {info}</div>
                    ))}
                </div>
            )}

            {data.hasChildren && (
                <button
                    className="nodrag"
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleNode(data.personId);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    style={{
                        marginTop: '8px',
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '11px',
                        pointerEvents: 'all',
                    }}
                >
                    {expanded ? '◀ Collapse' : '▶ Expand'}
                </button>
            )}

            <Handle type="source" position={Position.Right} style={{ background: '#555' }} />
        </div>
    );
}

export const FamilyNode = memo(FamilyNodeComponent);
