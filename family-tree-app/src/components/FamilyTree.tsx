import { useCallback, useEffect, useRef } from 'react';
import {
    ReactFlow,
    Controls,
    useNodesState,
    useEdgesState,
    useReactFlow,
    type Node,
    type Edge,
} from '@xyflow/react';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';

import { FamilyNode } from './FamilyNode';
import { TopMenu } from './TopMenu';
import { useTreeStore } from '../store';
import type { Person } from '../types';

const nodeTypes = { family: FamilyNode };

const NODE_WIDTH = 180;

function getLayoutedElements(
    allPersons: Record<string, Person>,
    rootId: string,
    expandedNodes: Set<string>
): { nodes: Node[]; edges: Edge[] } {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'LR', nodesep: 20, ranksep: 150 });

    const visiblePersons = new Set<string>();

    // Recursively add visible persons based on expandedNodes
    const addVisible = (personId: string) => {
        const person = allPersons[personId];
        if (!person) return;

        visiblePersons.add(personId);

        if (expandedNodes.has(personId)) {
            person.spouses.forEach(spouse => {
                spouse.childrenIds.forEach(childId => {
                    addVisible(childId);
                });
            });
        }
    };

    if (rootId && allPersons[rootId]) {
        addVisible(rootId);
    }

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Only layout visible persons
    visiblePersons.forEach((personId) => {
        const person = allPersons[personId];
        if (!person) return;

        const hasChildren = person.spouses.some(s => s.childrenIds.length > 0);

        dagreGraph.setNode(person.id, { width: NODE_WIDTH, height: 100 });

        nodes.push({
            id: person.id,
            type: 'family',
            position: { x: 0, y: 0 },
            data: {
                name: person.name,
                nameVN: person.nameVN,
                houseName: person.houseName,
                birthYear: person.birthYear,
                deathYear: person.deathYear,
                generation: person.generation,
                hasChildren,
                personId: person.id,
                spouses: person.spouses.map(s => ({
                    name: s.name,
                    marriageDate: s.marriageDate,
                    divorceDate: s.divorceDate
                })),
            },
        });

        // Add edges to visible children
        person.spouses.forEach(spouse => {
            spouse.childrenIds.forEach(childId => {
                if (visiblePersons.has(childId)) {
                    dagreGraph.setEdge(person.id, childId);
                    edges.push({
                        id: `${person.id}-${childId}`,
                        source: person.id,
                        target: childId,
                        style: { stroke: '#888', strokeWidth: 2 },
                        type: 'smoothstep', // smoother curves for LR
                    });
                }
            });
        });
    });

    dagre.layout(dagreGraph);

    // Find minX to shift everything to start at left edge
    let minX = Infinity;
    nodes.forEach(node => {
        const nodeWithPosition = dagreGraph.node(node.id);
        const x = nodeWithPosition.x - NODE_WIDTH / 2;
        if (x < minX) minX = x;
    });

    const X_OFFSET = 30; // Increased padding from left edge (was 16px)

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.position = {
            x: (nodeWithPosition.x - NODE_WIDTH / 2) - minX + X_OFFSET,
            y: nodeWithPosition.y - 100 / 2,
        };
    });

    return { nodes, edges };
}

export function FamilyTree() {
    const { familyData, expandedNodes } = useTreeStore();
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const { setCenter, setViewport } = useReactFlow();
    const initialized = useRef(false);

    // Re-layout when expanded nodes change
    useEffect(() => {
        if (!familyData) return;
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            familyData.allPersons,
            familyData.rootId,
            expandedNodes
        );
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

        // Initial alignment: Strict Left Edge
        if (!initialized.current && layoutedNodes.length > 0) {
            setTimeout(() => {
                // Force viewport to top-left (x=0, y=50)
                // With X_OFFSET=30, nodes will start 30px from the left edge.
                setViewport({ x: 0, y: 50, zoom: 0.8 });
                initialized.current = true;
            }, 100);
        }
    }, [familyData, expandedNodes, setNodes, setEdges, setViewport]);

    const handleResultSelect = useCallback((personId: string) => {
        const node = nodes.find(n => n.id === personId);
        if (node) {
            setTimeout(() => {
                setCenter(node.position.x + NODE_WIDTH / 2, node.position.y + 100 / 2, {
                    zoom: 1,
                    duration: 500,
                });
            }, 100);
        }
    }, [nodes, setCenter]);

    const { backgroundColor } = useTreeStore();

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            background: backgroundColor,
            transition: 'background 0.5s ease'
        }}>
            <TopMenu onResultSelect={handleResultSelect} />
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                panOnScroll
                zoomOnPinch
                nodesDraggable={false}
                nodesConnectable={false}
                minZoom={0.1}
                maxZoom={2}
            >
                <Controls />
                {/* Background pattern removed as requested */}
            </ReactFlow>
        </div>
    );
}
