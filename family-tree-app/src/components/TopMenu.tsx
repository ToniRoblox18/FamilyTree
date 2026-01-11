import { useState, useEffect, useRef } from 'react';
import { useReactFlow, getNodesBounds, getViewportForBounds } from '@xyflow/react';
import { toPng, toSvg } from 'html-to-image';
import { useTreeStore } from '../store';
import { SearchBar } from './SearchBar';

interface TopMenuProps {
    onResultSelect: (personId: string) => void;
}

export function TopMenu({ onResultSelect }: TopMenuProps) {
    const { familyData, toggleGeneration } = useTreeStore();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);



    // Determine max generation
    const maxGen = familyData
        ? Math.max(...Object.values(familyData.allPersons).map(p => p.generation))
        : 1;

    const generations = Array.from({ length: maxGen }, (_, i) => i + 1)
        .filter(gen => gen !== 5);

    const bgOptions = [
        // Warm Palette
        { name: 'Amber', value: 'linear-gradient(135deg, #5D2600 0%, #1F0D04 100%)', color: '#5D2600' },
        { name: 'Espresso', value: 'linear-gradient(135deg, #3E2B26 0%, #1A120B 100%)', color: '#3E2B26' },
        { name: 'Burgundy', value: 'linear-gradient(135deg, #4A0000 0%, #190A05 100%)', color: '#4A0000' },
        { name: 'Mauve', value: 'linear-gradient(to right, #41295a, #2f0743)', color: '#41295a' },
        // Cool/Dark Palette
        { name: 'Elegant', value: 'linear-gradient(to right, #434343 0%, #000000 100%)', color: '#434343' },
        { name: 'Cool', value: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)', color: '#203a43' },
        { name: 'Royal', value: 'linear-gradient(to right, #141e30, #243b55)', color: '#141e30' },
        { name: 'Purple', value: 'linear-gradient(to right, #240b36, #c31432)', color: '#240b36' },
        { name: 'Slate', value: '#0f172a', color: '#0f172a' },
        { name: 'Black', value: '#111', color: '#111' },
        { name: 'Paper', value: '#f8fafc', color: '#f8fafc' },
    ];

    const { getNodes } = useReactFlow();

    const downloadImage = (format: 'png' | 'svg') => {
        const viewport = document.querySelector('.react-flow__viewport');
        if (!viewport) return;

        const nodes = getNodes();
        if (nodes.length === 0) return;

        const bounds = getNodesBounds(nodes);
        const EXPORT_PADDING = 50;

        const imageWidth = bounds.width + (EXPORT_PADDING * 2);
        const imageHeight = bounds.height + (EXPORT_PADDING * 2);

        const options = {
            backgroundColor: useTreeStore.getState().backgroundColor.includes('gradient') ? '#111' : useTreeStore.getState().backgroundColor,
            width: imageWidth,
            height: imageHeight,
            style: {
                width: `${imageWidth}px`,
                height: `${imageHeight}px`,
                transform: `translate(${-bounds.x + EXPORT_PADDING}px, ${-bounds.y + EXPORT_PADDING}px)`,
            },
        };

        const downloader = format === 'png' ? toPng : toSvg;

        downloader(viewport as HTMLElement, options)
            .then((dataUrl: string) => {
                const link = document.createElement('a');
                link.download = `family-tree.${format}`;
                link.href = dataUrl;
                link.click();
            })
            .catch((err: Error) => {
                console.error('Export failed', err);
            });
    };

    return (
        <>
            {/* Gear Icon Trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    zIndex: 2100, // Higher than menu
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid #444',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    color: '#eee',
                    cursor: 'pointer',
                    fontSize: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    padding: 0,
                    lineHeight: 1,
                }}
                title="Settings"
            >
                ⚙
            </button>

            {/* Menu Dropdown */}
            {isOpen && (
                <div
                    ref={menuRef}
                    style={{
                        position: 'absolute',
                        top: 0, // Full height from top
                        left: 0,
                        zIndex: 2000,
                        height: 'auto', // Fit content height
                        maxHeight: '100vh', // Prevent overflow off screen
                        paddingBottom: '16px', // Add bottom padding for better look
                        width: '200px', // Reduced width (was 280px)
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        alignItems: 'flex-start',
                        background: 'rgba(15, 23, 42, 0.95)', // Deep dark slate, almost opaque
                        backdropFilter: 'blur(12px)',
                        padding: '16px',
                        paddingTop: '60px', // Space for gear icon
                        boxShadow: '4px 0 20px rgba(0,0,0,0.5)',
                        borderRight: '1px solid #333',
                        borderBottom: '1px solid #333', // Add bottom border
                        borderRadius: '0 0 12px 0', // Round bottom-right corner slightly
                        overflowY: 'auto',
                        transition: 'transform 0.3s ease',
                    }}
                >
                    <div style={{ width: '100%', marginBottom: '12px' }}>
                        <h3 style={{ color: '#fff', margin: 0, fontSize: '15px', fontWeight: 600 }}>Dang Family Tree</h3>
                        <p style={{ color: '#888', fontSize: '10px', margin: 0 }}>Menu & Settings</p>
                    </div>

                    <SearchBar
                        onResultSelect={onResultSelect}
                        className="compact-search"
                        style={{ width: '100%', fontSize: '11px' }}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                        {/* Background Selector - Color Swatches */}
                        <div style={{ marginBottom: '8px' }}>
                            <label style={{ color: '#aaa', fontSize: '9px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                                BACKGROUND
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                                {bgOptions.map((bg) => (
                                    <button
                                        key={bg.name}
                                        onClick={() => useTreeStore.getState().setBackgroundColor(bg.value)}
                                        title={bg.name}
                                        style={{
                                            width: '24px', // Reduced from 100% (approx 48px -> 24px)
                                            height: '24px',
                                            borderRadius: '50%',
                                            background: bg.color === '#f8fafc' ? '#eee' : bg.color,
                                            border: '1px solid #555',
                                            cursor: 'pointer',
                                            position: 'relative',
                                            padding: 0,
                                            margin: '0 auto', // Center in grid cell
                                        }}
                                    >
                                        <span style={{
                                            display: 'none', // Removed text for cleaner look, tooltip suffices? 
                                            // Or maybe show first letter? 
                                        }}></span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Export Section */}
                        <div style={{ marginBottom: '8px', borderTop: '1px solid #333', paddingTop: '8px', width: '100%' }}>
                            <label style={{ color: '#aaa', fontSize: '9px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                                EXPORT
                            </label>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                    onClick={() => downloadImage('png')}
                                    style={{
                                        flex: 1,
                                        background: '#333',
                                        color: '#fff',
                                        border: '1px solid #555',
                                        borderRadius: '4px',
                                        padding: '6px',
                                        fontSize: '10px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    PNG
                                </button>
                                <button
                                    onClick={() => downloadImage('svg')}
                                    style={{
                                        flex: 1,
                                        background: '#333',
                                        color: '#fff',
                                        border: '1px solid #555',
                                        borderRadius: '4px',
                                        padding: '6px',
                                        fontSize: '10px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    SVG
                                </button>
                            </div>
                        </div>

                        <div style={{ width: '100%', height: '1px', background: '#444', margin: '4px 0' }} />

                        {generations.map(gen => (
                            <div key={gen} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <span style={{ fontSize: '9px', textTransform: 'uppercase', color: '#aaa', fontWeight: 600, minWidth: '40px' }}>
                                    Gen {gen}
                                </span>
                                <div style={{ display: 'flex', gap: '2px' }}>
                                    <button
                                        onClick={() => toggleGeneration(gen, false)}
                                        style={{
                                            padding: '2px 6px',
                                            fontSize: '9px',
                                            background: '#333',
                                            border: '1px solid #555',
                                            borderRadius: '4px 0 0 4px',
                                            cursor: 'pointer',
                                            color: '#eee'
                                        }}
                                        title={`Collapse Gen ${gen}`}
                                    >
                                        -
                                    </button>
                                    <button
                                        onClick={() => toggleGeneration(gen, true)}
                                        style={{
                                            padding: '2px 6px',
                                            fontSize: '9px',
                                            background: '#333',
                                            border: '1px solid #555',
                                            borderLeft: 'none',
                                            borderRadius: '0 4px 4px 0',
                                            cursor: 'pointer',
                                            color: '#eee'
                                        }}
                                        title={`Expand Gen ${gen}`}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
