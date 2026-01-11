import { useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { FamilyTree } from './components/FamilyTree';
import { useTreeStore } from './store';
import { parseFamilyTree } from './parser';
import './index.css';

// Import the raw text file
import familyTreeText from '../FamilyTree.txt?raw';

function App() {
  const { setFamilyData, familyData } = useTreeStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const data = parseFamilyTree(familyTreeText);
      setFamilyData(data);
      console.log('Parsed family data:', data);
    } catch (error) {
      console.error('Failed to parse family tree:', error);
    } finally {
      setLoading(false);
    }
  }, [setFamilyData]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Stammbaum wird geladen...</p>
      </div>
    );
  }

  if (!familyData) {
    return (
      <div className="error-screen">
        <p>Fehler beim Laden des Stammbaums.</p>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <FamilyTree />
    </ReactFlowProvider>
  );
}

export default App;
