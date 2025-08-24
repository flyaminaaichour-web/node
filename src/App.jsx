
import { useEffect, useRef, useState } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import SpriteText from 'three-spritetext'
import './App.css'

function App() {
  const graphRef = useRef()
  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const [nodePositions, setNodePositions] = useState({})
  const [useFixedPositions, setUseFixedPositions] = useState(false)
  const [graphResetKey, setGraphResetKey] = useState(0) // Add reset key for forcing re-render
  
  // Node management states
  const [newNodeId, setNewNodeId] = useState('')
  const [newNodeGroup, setNewNodeGroup] = useState(1)
  const [selectedNodeId, setSelectedNodeId] = useState("")
  const [selectedNodeColor, setSelectedNodeColor] = useState("")
  const [selectedNodeTextSize, setSelectedNodeTextSize] = useState(0)
  const [selectedLinkId, setSelectedLinkId] = useState(null)
  const [selectedLinkColor, setSelectedLinkColor] = useState("")
  const [selectedLinkThickness, setSelectedLinkThickness] = useState(0)
  const [sourceNodeId, setSourceNodeId] = useState("")
  const [targetNodeId, setTargetNodeId] = useState("")
  const [showNodeManager, setShowNodeManager] = useState(false)
  const [jsonFile, setJsonFile] = useState(null)

  useEffect(() => {
    if (jsonFile) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result)
          setGraphData({
            nodes: data.nodes.map(node => {
              // Remove fixed positions (fx, fy, fz) to allow node movement
              const { fx, fy, fz, ...nodeWithoutFixed } = node
              return { 
                ...nodeWithoutFixed, 
                color: node.color || "#1A75FF", 
                textSize: node.textSize || 6 
              }
            }),
            links: data.links.map(link => ({ ...link, color: link.color || "#F0F0F0", thickness: link.thickness || 1 }))
          })
        } catch (error) {
          console.error("Error parsing JSON file:", error)
          alert("Error parsing JSON file. Please ensure it is valid JSON.")
        }
      }
      reader.readAsText(jsonFile)
    } else {
      setGraphData({ nodes: [], links: [] }) // Start with an empty graph
    }
  }, [jsonFile])

  useEffect(() => {
    if (graphRef.current) {
      const forceLink = graphRef.current.d3Force("link");
      if (forceLink) forceLink.links(graphData.links);
      const forceCharge = graphRef.current.d3Force("charge");
      if (forceCharge) forceCharge.nodes(graphData.nodes);
      graphRef.current.d3ReheatSimulation();
      graphRef.current.graphData(graphData);
    }
  }, [graphData])

  const handleNewGraph = () => {
    setGraphData({ nodes: [], links: [] })
    setJsonFile(null) // Clear any loaded JSON file
    setSelectedNodeId("")
    setSelectedLinkId(null)
    setNodePositions({}) // Clear node positions
    setUseFixedPositions(false) // Reset fixed positions flag
    setNewNodeId('') // Clear new node input
    setNewNodeGroup(1) // Reset new node group
    setSelectedNodeColor("") // Clear selected node color
    setSelectedNodeTextSize(0) // Clear selected node text size
    setSelectedLinkColor("") // Clear selected link color
    setSelectedLinkThickness(0) // Clear selected link thickness
    setSourceNodeId("") // Clear source node input
    setTargetNodeId("") // Clear target node input
    setGraphResetKey(prev => prev + 1) // Force complete re-rendering of ForceGraph3D
  }
  const addNode = () => {
    if (!newNodeId.trim()) {
      alert('Please enter a node ID')
      return
    }
    
    // Check if node already exists
    if (graphData.nodes.find(node => node.id === newNodeId.trim())) {
      alert('Node with this ID already exists')
      return
    }
    
    const newNode = {
      id: newNodeId.trim(),
      group: parseInt(newNodeGroup),
      color: "#1A75FF", // Default node color
      textSize: 6, // Default node text size
      x: Math.random() * 200 - 100, // Random position
      y: Math.random() * 200 - 100,
      z: Math.random() * 200 - 100
    }
    
    setGraphData(prevData => ({
      ...prevData,
      nodes: [...prevData.nodes, newNode]
    }))
    
    setNewNodeId('')
    console.log('Added node:', newNode)
  }

  // Delete selected node
  const deleteNode = () => {
    if (!selectedNodeId) {
      alert('Please select a node to delete')
      return
    }
    
    // Remove node and all associated links
    setGraphData(prevData => ({
      nodes: prevData.nodes.filter(node => node.id !== selectedNodeId),
      links: prevData.links.filter(link => 
        link.source !== selectedNodeId && 
        link.target !== selectedNodeId &&
        link.source.id !== selectedNodeId && 
        link.target.id !== selectedNodeId
      )
    }))
    
    setSelectedNodeId('')
    console.log('Deleted node:', selectedNodeId)
  }

  // Add link between two nodes
  const addLink = (sourceId, targetId, value = 1) => {
    if (!sourceId || !targetId || sourceId === targetId) return
    
    // Check if link already exists
    const linkExists = graphData.links.find(link => 
      (link.source === sourceId && link.target === targetId) ||
      (link.source === targetId && link.target === sourceId) ||
      (link.source.id === sourceId && link.target.id === targetId) ||
      (link.source.id === targetId && link.target.id === sourceId)
    )
    
    if (linkExists) return
    
    const newLink = {
      source: sourceId,
      target: targetId,
      value: value,
      color: "#F0F0F0", // Default link color
      thickness: 1 // Default link thickness
    }
    
    setGraphData(prevData => ({
      ...prevData,
      links: [...prevData.links, newLink]
    }))
  }

  const saveGraphData = () => {
    if (!graphRef.current) return

    setGraphData(prevGraphData => {
      const dataToSave = {
        nodes: prevGraphData.nodes.map(node => {
          if (node.x === undefined || node.y === undefined || node.z === undefined) {
            return { ...node, x: 0, y: 0, z: 0, color: node.color || "#1A75FF", textSize: node.textSize || 6 }
          }
          return { ...node, color: node.color || "#1A75FF", textSize: node.textSize || 6 }
        }),
        links: prevGraphData.links.map(link => ({ ...link, color: link.color || "#F0F0F0", thickness: link.thickness || 1 })),
      }

      // Create downloadable JSON file
      const dataStr = JSON.stringify(dataToSave, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'graphData.json'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      console.log('Graph data saved:', dataToSave)
      return prevGraphData // Return the previous state as we are only saving, not modifying the state here
    })
  }

  // Load node positions from uploaded JSON file
  const loadNodePositions = (event) => {
    const file = event.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const positions = JSON.parse(e.target.result)
        setNodePositions(positions)
        
        // Apply positions to nodes
        const updatedNodes = graphData.nodes.map(node => {
          if (positions[node.id]) {
            return {
              ...node,
              x: positions[node.id].x,
              y: positions[node.id].y,
              z: positions[node.id].z,
            }
          }
          return node
        })
        
        setGraphData({ ...graphData, nodes: updatedNodes })
        setUseFixedPositions(false) // Ensure nodes are not fixed
        console.log('Node positions loaded:', positions)
      } catch (error) {
        console.error('Error loading node positions:', error)
        alert('Error loading node positions file')
      }
    }
    reader.readAsText(file)
  }

  // Toggle between fixed and dynamic positioning
  const toggleFixedPositions = () => {
    const updatedNodes = graphData.nodes.map(node => {
      if (useFixedPositions) {
        // Remove fixed positions to allow dynamic movement
        const { fx, fy, fz, ...nodeWithoutFixed } = node
        return nodeWithoutFixed
      } else {
        // Fix current positions
        return {
          ...node,
          fx: node.x,
          fy: node.y,
          fz: node.z
        }
      }
    })
    
    setGraphData({ ...graphData, nodes: updatedNodes })
    setUseFixedPositions(!useFixedPositions)
  }

  const onNodeClick = (node) => {
    const distance = 400;
    const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

    console.log("Clicked node:", node.id, { x: node.x, y: node.y, z: node.z, fx: node.fx });

    // Pause simulation during camera movement
    graphRef.current.d3Force("charge").strength(0);
    graphRef.current.d3Force("link").strength(0);

    graphRef.current.cameraPosition(
      { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
      node,
      2000
    );

    // Resume simulation after camera movement
    setTimeout(() => {
      graphRef.current.d3Force("charge").strength(-30); // Adjust strength as needed
      graphRef.current.d3Force("link").strength(1);
      graphRef.current.d3ReheatSimulation();
    }, 2000);

    // Ensure node is not fixed unless intended
    if (!useFixedPositions) {
      delete node.fx;
      delete node.fy;
      delete node.fz;
      setGraphData(prevData => {
        return {
          ...prevData,
          nodes: prevData.nodes.map(n =>
            n.id === node.id ? { ...n, fx: undefined, fy: undefined, fz: undefined } : n
          ),
        };
      });
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, position: 'relative' }}>
      {/* Control Panel */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.9)',
        padding: '15px',
        borderRadius: '8px',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '300px'
      }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Graph Controls</h3>
        
        {/* Node Customization Controls */}
        <div style={{ marginBottom: '20px', borderBottom: '1px solid #444', paddingBottom: '15px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#ccc' }}>Node Customization</h4>
          <div style={{ marginBottom: '8px' }}>
            <select
              value={selectedNodeId}
              onChange={(e) => {
                const nodeId = e.target.value
                setSelectedNodeId(nodeId)
                const node = graphData.nodes.find(n => n.id === nodeId)
                if (node) {
                  setSelectedNodeColor(node.color || "#1A75FF")
                  setSelectedNodeTextSize(node.textSize || 6)
                }
              }}
              style={{
                width: '100%',
                padding: '4px 6px',
                borderRadius: '3px',
                border: '1px solid #555',
                background: '#333',
                color: 'white',
                fontSize: '11px',
                marginBottom: '8px'
              }}
            >
              <option value="">Select Node to Customize</option>
              {graphData.nodes.map(node => (
                <option key={node.id} value={node.id}>{node.id}</option>
              ))}
            </select>
          </div>
          {selectedNodeId && (
            <>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', marginRight: '10px' }}>Color:</label>
                <input type="color" value={selectedNodeColor} onChange={(e) => {
                  setSelectedNodeColor(e.target.value)
                  setGraphData(prevData => ({
                    ...prevData,
                    nodes: prevData.nodes.map(node =>
                      node.id === selectedNodeId ? { ...node, color: e.target.value } : node
                    )
                  }))
                }} />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', marginRight: '10px' }}>Text Size:</label>
                <input type="range" min="1" max="20" value={selectedNodeTextSize} onChange={(e) => {
                  const size = parseInt(e.target.value)
                  setSelectedNodeTextSize(size)
                  setGraphData(prevData => ({
                    ...prevData,
                    nodes: prevData.nodes.map(node =>
                      node.id === selectedNodeId ? { ...node, textSize: size } : node
                    )
                  }))
                }} />
                <span style={{ fontSize: '12px', marginLeft: '5px' }}>{selectedNodeTextSize}</span>
              </div>
            </>
          )}
        </div>

        {/* Link Customization Controls */}
        <div style={{ marginBottom: '20px', borderBottom: '1px solid #444', paddingBottom: '15px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#ccc' }}>Link Customization</h4>
          <div style={{ marginBottom: '8px' }}>
            <select
              value={selectedLinkId ? `${selectedLinkId.source.id}-${selectedLinkId.target.id}` : ''}
              onChange={(e) => {
                const [sourceId, targetId] = e.target.value.split('-')
                const link = graphData.links.find(l => l.source.id === sourceId && l.target.id === targetId)
                setSelectedLinkId(link)
                if (link) {
                  setSelectedLinkColor(link.color || "#F0F0F0")
                  setSelectedLinkThickness(link.thickness || 1)
                }
              }}
              style={{
                width: '100%',
                padding: '4px 6px',
                borderRadius: '3px',
                border: '1px solid #555',
                background: '#333',
                color: 'white',
                fontSize: '11px',
                marginBottom: '8px'
              }}
            >
              <option value="">Select Link to Customize</option>
              {graphData.links.map(link => (
                <option key={`${link.source.id}-${link.target.id}`} value={`${link.source.id}-${link.target.id}`}>
                  {`${link.source.id} - ${link.target.id}`}
                </option>
              ))}
            </select>
          </div>
          {selectedLinkId && (
            <>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', marginRight: '10px' }}>Color:</label>
                <input type="color" value={selectedLinkColor} onChange={(e) => {
                  setSelectedLinkColor(e.target.value)
                  setGraphData(prevData => ({
                    ...prevData,
                    links: prevData.links.map(link =>
                      (link.source.id === selectedLinkId.source.id && link.target.id === selectedLinkId.target.id)
                        ? { ...link, color: e.target.value } : link
                    )
                  }))
                }} />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', marginRight: '10px' }}>Thickness:</label>
                <input type="range" min="0.1" max="5" step="0.1" value={selectedLinkThickness} onChange={(e) => {
                  const thickness = parseFloat(e.target.value)
                  setSelectedLinkThickness(thickness)
                  setGraphData(prevData => ({
                    ...prevData,
                    links: prevData.links.map(link =>
                      (link.source.id === selectedLinkId.source.id && link.target.id === selectedLinkId.target.id)
                        ? { ...link, thickness: thickness } : link
                    )
                  }))
                }} />
                <span style={{ fontSize: '12px', marginLeft: '5px' }}>{selectedLinkThickness}</span>
              </div>
            </>
          )}
        </div>

        {/* Position Controls */}
        <div className="data-loading-section" style={{ marginBottom: '20px', borderBottom: '1px solid #444', paddingBottom: '15px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#ccc' }}>Data Loading</h4>
          <label style={{
            background: '#2196F3',
            color: 'white',
            border: 'none',
            padding: '6px 10px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'block',
            textAlign: 'center',
            marginBottom: '10px'
          }}>
            Load Custom JSON
            <input
              type="file"
              accept=".json"
              onChange={(e) => setJsonFile(e.target.files[0])}
              style={{ display: 'none' }}
            />
          </label>
          <button
            onClick={handleNewGraph}
            style={{
              background: '#FF5722',
              color: 'white',
              border: 'none',
              padding: '6px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              width: '100%',
              marginBottom: '10px'
            }}
          >
            New Graph
          </button>
          <button
            onClick={saveGraphData}
            style={{
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '6px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              width: '100%',
              marginBottom: '10px'
            }}
          >
            Save Graph Data
          </button>
          <label style={{
            background: '#9C27B0',
            color: 'white',
            border: 'none',
            padding: '6px 10px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'block',
            textAlign: 'center',
            marginBottom: '10px'
          }}>
            Load Node Positions
            <input
              type="file"
              accept=".json"
              onChange={loadNodePositions}
              style={{ display: 'none' }}
            />
          </label>
          <button
            onClick={toggleFixedPositions}
            style={{
              background: useFixedPositions ? '#f44336' : '#009688',
              color: 'white',
              border: 'none',
              padding: '6px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              width: '100%'
            }}
          >
            {useFixedPositions ? 'Unlock Node Positions' : 'Lock Node Positions'}
          </button>
        </div>

        {/* Node Management */}
        <div style={{ marginBottom: '20px', borderBottom: '1px solid #444', paddingBottom: '15px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#ccc' }}>Node Management</h4>
          <div style={{ marginBottom: '8px' }}>
            <input
              type="text"
              value={newNodeId}
              onChange={(e) => setNewNodeId(e.target.value)}
              placeholder="Enter New Node ID"
              style={{
                width: 'calc(100% - 12px)',
                padding: '4px 6px',
                borderRadius: '3px',
                border: '1px solid #555',
                background: '#333',
                color: 'white',
                fontSize: '11px',
                marginBottom: '8px'
              }}
            />
            <button
              onClick={addNode}
              style={{
                background: '#2196F3',
                color: 'white',
                border: 'none',
                padding: '6px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                width: '100%'
              }}
            >
              Add Node
            </button>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <select
              value={selectedNodeId}
              onChange={(e) => setSelectedNodeId(e.target.value)}
              style={{
                width: '100%',
                padding: '4px 6px',
                borderRadius: '3px',
                border: '1px solid #555',
                background: '#333',
                color: 'white',
                fontSize: '11px',
                marginBottom: '8px'
              }}
            >
              <option value="">Select Node to Delete</option>
              {graphData.nodes.map(node => (
                <option key={node.id} value={node.id}>{node.id}</option>
              ))}
            </select>
            <button
              onClick={deleteNode}
              style={{
                background: '#f44336',
                color: 'white',
                border: 'none',
                padding: '6px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                width: '100%'
              }}
            >
              Delete Selected Node
            </button>
          </div>
        </div>

        {/* Link Management */}
        <div>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#ccc' }}>Link Management</h4>
          <div style={{ marginBottom: '8px' }}>
            <select
              value={sourceNodeId}
              onChange={(e) => setSourceNodeId(e.target.value)}
              style={{
                width: '100%',
                padding: '4px 6px',
                borderRadius: '3px',
                border: '1px solid #555',
                background: '#333',
                color: 'white',
                fontSize: '11px',
                marginBottom: '8px'
              }}
            >
              <option value="">Select Source Node</option>
              {graphData.nodes.map(node => (
                <option key={node.id} value={node.id}>{node.id}</option>
              ))}
            </select>
            <select
              value={targetNodeId}
              onChange={(e) => setTargetNodeId(e.target.value)}
              style={{
                width: '100%',
                padding: '4px 6px',
                borderRadius: '3px',
                border: '1px solid #555',
                background: '#333',
                color: 'white',
                fontSize: '11px',
                marginBottom: '8px'
              }}
            >
              <option value="">Select Target Node</option>
              {graphData.nodes.map(node => (
                <option key={node.id} value={node.id}>{node.id}</option>
              ))}
            </select>
            <button
              onClick={() => addLink(sourceNodeId, targetNodeId)}
              style={{
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                padding: '6px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                width: '100%'
              }}
            >
              Add Link
            </button>
          </div>
        </div>
      </div>

      <ForceGraph3D
        key={graphResetKey}
        ref={graphRef}
        graphData={graphData}
        nodeAutoColorBy="group"
        nodeThreeObject={node => {
          const sprite = new SpriteText(node.id)
          sprite.color = node.color || 'white' // Use node color or default
          sprite.textHeight = node.textSize || 6 // Use node text size or default
          return sprite
        }}
        onNodeClick={onNodeClick}
        linkWidth={link => link.thickness || 1} // Use link thickness or default
        linkColor={link => link.color || '#F0F0F0'} // Use link color or default
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.006}
      />
    </div>
  )
}

export default App





  const onNodeDragEnd = (node) => {
    if (useFixedPositions) {
      node.fx = node.x;
      node.fy = node.y;
      node.fz = node.z;
    } else {
      delete node.fx;
      delete node.fy;
      delete node.fz;
    }
  };




  const onNodeDragEnd = (node) => {
    if (useFixedPositions) {
      node.fx = node.x;
      node.fy = node.y;
      node.fz = node.z;
    } else {
      delete node.fx;
      delete node.fy;
      delete node.fz;
    }
  };




  const onNodeDragEnd = (node) => {
    if (useFixedPositions) {
      node.fx = node.x;
      node.fy = node.y;
      node.fz = node.z;
    } else {
      delete node.fx;
      delete node.fy;
      delete node.fz;
    }
  };




  const onNodeDragEnd = (node) => {
    if (useFixedPositions) {
      node.fx = node.x;
      node.fy = node.y;
      node.fz = node.z;
    } else {
      delete node.fx;
      delete node.fy;
      delete node.fz;
    }
  };


const onNodeDragEnd = (node) => {
    if (useFixedPositions) {
      node.fx = node.x;
      node.fy = node.y;
      node.fz = node.z;
    } else {
      delete node.fx;
      delete node.fy;
      delete node.fz;
    }
  };

