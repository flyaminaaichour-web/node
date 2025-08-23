import { useEffect, useRef, useState } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import SpriteText from 'three-spritetext'
import './App.css'

function App() {
  const graphRef = useRef()
  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const [nodePositions, setNodePositions] = useState({})
  const [useFixedPositions, setUseFixedPositions] = useState(false)
  
  // Node management states
  const [newNodeId, setNewNodeId] = useState('')
  const [newNodeGroup, setNewNodeGroup] = useState(1)
  const [selectedNodeId, setSelectedNodeId] = useState("")
  const [selectedNodeColor, setSelectedNodeColor] = useState("")
  const [selectedNodeTextSize, setSelectedNodeTextSize] = useState(0)
  const [selectedNodeCategory, setSelectedNodeCategory] = useState("") // New state for selected node category
  const [selectedNodePrice, setSelectedNodePrice] = useState(0) // New state for selected node price
  const [selectedNodeMonth, setSelectedNodeMonth] = useState("") // New state for selected node month
  const [selectedNodeEnergy, setSelectedNodeEnergy] = useState("") // New state for selected node energy
  const [selectedNodeTime, setSelectedNodeTime] = useState("") // New state for selected node time
  const [selectedLinkId, setSelectedLinkId] = useState(null)
  const [selectedLinkColor, setSelectedLinkColor] = useState("")
  const [selectedLinkThickness, setSelectedLinkThickness] = useState(0)
  const [sourceNodeId, setSourceNodeId] = useState("")
  const [targetNodeId, setTargetNodeId] = useState("")
  const [showNodeManager, setShowNodeManager] = useState(false)
  const [jsonFile, setJsonFile] = useState(null)
  const [categories, setCategories] = useState({
    'default': { color: '#1A75FF' },
    'expenses': { color: '#FF0000' },
    'income': { color: '#00FF00' },
    'assets': { color: '#0000FF' }
  }) // Predefined categories
  const [newNodeCategory, setNewNodeCategory] = useState('default') // New state for new node category
  const [newNodePrice, setNewNodePrice] = useState(0) // New state for new node price
  const [newNodeMonth, setNewNodeMonth] = useState("") // New state for new node month
  const [newNodeEnergy, setNewNodeEnergy] = useState("") // New state for new node energy
  const [newNodeTime, setNewNodeTime] = useState("") // New state for new node time
  const [showOnlyExpenses, setShowOnlyExpenses] = useState(false) // New state for expense filter

  // Add ref for file input
  const fileInputRef = useRef(null)

  // Months array for dropdown
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // Filter graph data based on showOnlyExpenses state
  const getFilteredGraphData = () => {
    if (!showOnlyExpenses) {
      return graphData
    }
    
    // Filter nodes to show only expenses
    const expenseNodes = graphData.nodes.filter(node => node.category === 'expenses')
    const expenseNodeIds = new Set(expenseNodes.map(node => node.id))
    
    // Filter links to show only those connecting expense nodes
    const expenseLinks = graphData.links.filter(link => {
      const sourceId = getLinkSourceId(link)
      const targetId = getLinkTargetId(link)
      return expenseNodeIds.has(sourceId) && expenseNodeIds.has(targetId)
    })
    
    return {
      nodes: expenseNodes,
      links: expenseLinks
    }
  }

  // Calculate monthly expense summary
  const getMonthlyExpenseSummary = () => {
    const summary = {}
    graphData.nodes
      .filter(node => node.category === 'expenses' && node.price && node.month)
      .forEach(node => {
        if (!summary[node.month]) {
          summary[node.month] = 0
        }
        summary[node.month] += parseFloat(node.price) || 0
      })
    return summary
  }

  useEffect(() => {
    if (jsonFile) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result)
          
          // Process nodes first
          const processedNodes = data.nodes.map(node => ({
            ...node,
            color: node.color || categories[node.category]?.color || categories['default'].color,
            textSize: node.textSize || 6,
            category: node.category || 'default',
            price: node.price || 0,
            month: node.month || '',
            energy: node.energy || '',
            time: node.time || ''
          }))
          
          // Process links to ensure proper node references
          const processedLinks = data.links.map(link => ({
            ...link,
            source: typeof link.source === 'object' ? link.source.id : link.source,
            target: typeof link.target === 'object' ? link.target.id : link.target,
            color: link.color || "#F0F0F0",
            thickness: link.thickness || 1
          }))
          
          setGraphData({
            nodes: processedNodes,
            links: processedLinks
          })
          
          // Force update the graph after a short delay to ensure proper rendering
          setTimeout(() => {
            if (graphRef.current) {
              graphRef.current.d3ReheatSimulation()
            }
          }, 100)
          
        } catch (error) {
          console.error("Error parsing JSON file:", error)
          alert("Error parsing JSON file. Please ensure it is valid JSON.")
        }
      }
      reader.readAsText(jsonFile)
    } else {
      setGraphData({ nodes: [], links: [] })
    }
  }, [jsonFile, categories])

  useEffect(() => {
    if (graphRef.current && graphData.nodes.length > 0) {
      // Re-heat the simulation when graphData changes
      try {
        // Update the graph data first
        graphRef.current.graphData(graphData)
        
        // Then update the forces with the new data
        const linkForce = graphRef.current.d3Force("link")
        if (linkForce) {
          linkForce.links(graphData.links)
        }
        
        const chargeForce = graphRef.current.d3Force("charge")
        if (chargeForce) {
          chargeForce.nodes(graphData.nodes)
        }
        
        // Restart the simulation with a higher alpha target for better movement
        graphRef.current.d3Force("alphaTarget", 0.1).restart()
        
        // After a short delay, reduce alpha target to stabilize
        setTimeout(() => {
          if (graphRef.current) {
            graphRef.current.d3Force("alphaTarget", 0)
          }
        }, 1000)
        
      } catch (error) {
        console.error("Error updating graph:", error)
      }
    }
  }, [graphData])

  const handleNewGraph = () => {
    setGraphData({ nodes: [], links: [] })
    setJsonFile(null) // Clear any loaded JSON file
    setSelectedNodeId("")
    setSelectedLinkId(null)
    
    // Reset the file input to allow re-selecting the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    
    // Reset all form states
    setNewNodeId("")
    setNewNodeGroup("Group 1")
    setNewNodeCategory("default")
    setNewNodePrice(0)
    setNewNodeMonth("")
    setNewNodeEnergy("")
    setNewNodeTime("")
    setSelectedNodeColor("#1A75FF")
    setSelectedNodeTextSize(6)
    setSelectedNodeCategory("default")
    setSelectedNodePrice(0)
    setSelectedNodeMonth("")
    setSelectedNodeEnergy("")
    setSelectedNodeTime("")
    setShowOnlyExpenses(false)
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
      color: categories[newNodeCategory]?.color || categories['default'].color, // Use category color
      textSize: 6, // Default node text size
      category: newNodeCategory, // Assign category
      price: newNodeCategory === 'expenses' ? parseFloat(newNodePrice) || 0 : 0, // Assign price only for expenses
      month: newNodeCategory === 'expenses' ? newNodeMonth : '', // Assign month only for expenses
      energy: newNodeEnergy, // Assign energy
      time: newNodeTime, // Assign time
      x: Math.random() * 200 - 100, // Random position
      y: Math.random() * 200 - 100,
      z: Math.random() * 200 - 100
    }
    
    setGraphData(prevData => ({
      ...prevData,
      nodes: [...prevData.nodes, newNode]
    }))
    
    setNewNodeId("")
    setNewNodePrice(0)
    setNewNodeMonth("")
    setNewNodeEnergy("")
    setNewNodeTime("")
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
      links: prevData.links.filter(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source
        const targetId = typeof link.target === 'object' ? link.target.id : link.target
        return sourceId !== selectedNodeId && targetId !== selectedNodeId
      })
    }))
    
    setSelectedNodeId('')
    console.log('Deleted node:', selectedNodeId)
  }

  // Add link between two nodes
  const addLink = (sourceId, targetId, value = 1) => {
    if (!sourceId || !targetId || sourceId === targetId) return
    
    // Check if link already exists
    const linkExists = graphData.links.find(link => {
      const linkSourceId = typeof link.source === 'object' ? link.source.id : link.source
      const linkTargetId = typeof link.target === 'object' ? link.target.id : link.target
      return (linkSourceId === sourceId && linkTargetId === targetId) ||
             (linkSourceId === targetId && linkTargetId === sourceId)
    })
    
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
            return { 
              ...node, 
              x: 0, y: 0, z: 0, 
              color: node.color || categories[node.category]?.color || categories['default'].color, 
              textSize: node.textSize || 6, 
              category: node.category || 'default',
              price: node.price || 0,
              month: node.month || "",
              energy: node.energy || "",
              time: node.time || ""
            }
          }
          return { 
            ...node, 
            color: node.color || categories[node.category]?.color || categories["default"].color, 
            textSize: node.textSize || 6, 
            category: node.category || "default",
            price: node.price || 0,
            month: node.month || "",
            energy: node.energy || "",
            time: node.time || ""
          }
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
              fx: positions[node.id].x, // Fix position
              fy: positions[node.id].y,
              fz: positions[node.id].z
            }
          }
          return node
        })
        
        setGraphData({ ...graphData, nodes: updatedNodes })
        setUseFixedPositions(true)
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

  // Helper function to safely get link source/target IDs
  const getLinkSourceId = (link) => {
    return typeof link.source === 'object' ? link.source.id : link.source
  }

  const getLinkTargetId = (link) => {
    return typeof link.target === 'object' ? link.target.id : link.target
  }

  const monthlyExpenseSummary = getMonthlyExpenseSummary()

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
                  setSelectedNodeColor(node.color || categories[node.category]?.color || categories['default'].color)
                  setSelectedNodeTextSize(node.textSize || 6)
                  setSelectedNodeCategory(node.category || 'default') // Set selected node category
                  setSelectedNodePrice(node.price || 0) // Set selected node price
                  setSelectedNodeMonth(node.month || '') // Set selected node month
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
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', marginRight: '10px' }}>Category:</label>
                <select
                  value={selectedNodeCategory}
                  onChange={(e) => {
                    const category = e.target.value
                    setSelectedNodeCategory(category)
                    setGraphData(prevData => ({
                      ...prevData,
                      nodes: prevData.nodes.map(node =>
                        node.id === selectedNodeId ? { ...node, category: category, color: categories[category]?.color || categories['default'].color } : node
                      )
                    }))
                  }}
                  style={{
                    width: '100%',
                    padding: '4px 6px',
                    borderRadius: '3px',
                    border: '1px solid #555',
                    background: '#333',
                    color: 'white',
                    fontSize: '11px'
                  }}
                >
                  {Object.keys(categories).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              {selectedNodeCategory === 'expenses' && (
                <>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', marginRight: '10px' }}>Price:</label>
                    <input 
                      type="number" 
                      value={selectedNodePrice} 
                      onChange={(e) => {
                        const price = parseFloat(e.target.value) || 0
                        setSelectedNodePrice(price)
                        setGraphData(prevData => ({
                          ...prevData,
                          nodes: prevData.nodes.map(node =>
                            node.id === selectedNodeId ? { ...node, price: price } : node
                          )
                        }))
                      }}
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        borderRadius: '3px',
                        border: '1px solid #555',
                        background: '#333',
                        color: 'white',
                        fontSize: '11px'
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', marginRight: '10px' }}>Month:</label>
                    <select
                      value={selectedNodeMonth}
                      onChange={(e) => {
                        const month = e.target.value
                        setSelectedNodeMonth(month)
                        setGraphData(prevData => ({
                          ...prevData,
                          nodes: prevData.nodes.map(node =>
                            node.id === selectedNodeId ? { ...node, month: month } : node
                          )
                        }))
                      }}
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        borderRadius: '3px',
                        border: '1px solid #555',
                        background: '#333',
                        color: 'white',
                        fontSize: '11px'
                      }}
                    >
                      <option value="">Select Month</option>
                      {months.map(month => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', marginRight: '10px' }}>Energy:</label>
                <select
                  value={selectedNodeEnergy}
                  onChange={(e) => {
                    const energy = e.target.value
                    setSelectedNodeEnergy(energy)
                    setGraphData(prevData => ({
                      ...prevData,
                      nodes: prevData.nodes.map(node =>
                        node.id === selectedNodeId ? { ...node, energy: energy } : node
                      )
                    }))
                  }}
                  style={{
                    width: '100%',
                    padding: '4px 6px',
                    borderRadius: '3px',
                    border: '1px solid #555',
                    background: '#333',
                    color: 'white',
                    fontSize: '11px'
                  }}
                >
                  <option value="">Select Energy Level</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', marginRight: '10px' }}>Time:</label>
                <select
                  value={selectedNodeTime}
                  onChange={(e) => {
                    const time = e.target.value
                    setSelectedNodeTime(time)
                    setGraphData(prevData => ({
                      ...prevData,
                      nodes: prevData.nodes.map(node =>
                        node.id === selectedNodeId ? { ...node, time: time } : node
                      )
                    }))
                  }}
                  style={{
                    width: '100%',
                    padding: '4px 6px',
                    borderRadius: '3px',
                    border: '1px solid #555',
                    background: '#333',
                    color: 'white',
                    fontSize: '11px'
                  }}
                >
                  <option value="">Select Time</option>
                  <option value="30 minutes">30 minutes</option>
                  <option value="1 hour">1 hour</option>
                  <option value="2 hours">2 hours</option>
                  <option value="3 hours">3 hours</option>
                </select>
              </div>
            </>
          )}
        </div>
        <div style={{ marginBottom: '20px', borderBottom: '1px solid #444', paddingBottom: '15px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#ccc' }}>Link Customization</h4>
          <div style={{ marginBottom: '8px' }}>
            <select
              value={selectedLinkId ? `${getLinkSourceId(selectedLinkId)}-${getLinkTargetId(selectedLinkId)}` : ''}
              onChange={(e) => {
                if (!e.target.value) {
                  setSelectedLinkId(null)
                  return
                }
                const [sourceId, targetId] = e.target.value.split('-');
                const link = graphData.links.find(l => 
                  getLinkSourceId(l) === sourceId && getLinkTargetId(l) === targetId
                );
                setSelectedLinkId(link);
                if (link) {
                  setSelectedLinkColor(link.color || "#F0F0F0");
                  setSelectedLinkThickness(link.thickness || 1);
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
              {graphData.links.map((link, index) => (
                <option key={index} value={`${getLinkSourceId(link)}-${getLinkTargetId(link)}`}>
                  {`${getLinkSourceId(link)} - ${getLinkTargetId(link)}`}
                </option>
              ))}
            </select>
          </div>
          {selectedLinkId && (
            <>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', marginRight: '10px' }}>Color:</label>
                <input type="color" value={selectedLinkColor} onChange={(e) => {
                  setSelectedLinkColor(e.target.value);
                  setGraphData(prevData => ({
                    ...prevData,
                    links: prevData.links.map(link =>
                      (getLinkSourceId(link) === getLinkSourceId(selectedLinkId) && 
                       getLinkTargetId(link) === getLinkTargetId(selectedLinkId))
                        ? { ...link, color: e.target.value } : link
                    )
                  }));
                }} />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', marginRight: '10px' }}>Thickness:</label>
                <input type="range" min="0.1" max="5" step="0.1" value={selectedLinkThickness} onChange={(e) => {
                  const thickness = parseFloat(e.target.value);
                  setSelectedLinkThickness(thickness);
                  setGraphData(prevData => ({
                    ...prevData,
                    links: prevData.links.map(link =>
                      (getLinkSourceId(link) === getLinkSourceId(selectedLinkId) && 
                       getLinkTargetId(link) === getLinkTargetId(selectedLinkId))
                        ? { ...link, thickness: thickness } : link
                    )
                  }));
                }} />
                <span style={{ fontSize: '12px', marginLeft: '5px' }}>{selectedLinkThickness}</span>
              </div>
            </>
          )}
        </div>

        {/* Data Loading Controls */}
        <div style={{ marginBottom: '20px', borderBottom: '1px solid #444', paddingBottom: '15px' }}>
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
              ref={fileInputRef}
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
              display: 'block',
              textAlign: 'center',
              width: '100%'
            }}
          >
            New Graph
          </button>
        </div>

        {/* Position Controls */}
        <div style={{ marginBottom: '20px', borderBottom: '1px solid #444', paddingBottom: '15px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#ccc' }}>Position Controls</h4>
          <div style={{ marginBottom: '10px' }}>
            <button
              onClick={saveGraphData}
              style={{
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                padding: '6px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '8px',
                fontSize: '12px'
              }}
            >
              Save Graph Data
            </button>
            
            <label style={{
              background: '#2196F3',
              color: 'white',
              border: 'none',
              padding: '6px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}>
              Load Positions
              <input
                type="file"
                accept=".json"
                onChange={loadNodePositions}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          
          <button
            onClick={toggleFixedPositions}
            style={{
              background: useFixedPositions ? '#FF9800' : '#607D8B',
              color: 'white',
              border: 'none',
              padding: '6px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              width: '100%'
            }}
          >
            {useFixedPositions ? 'Enable Dynamic' : 'Fix Positions'}
          </button>
        </div>

        {/* Node Manager */}
        <div>
          <div style={{ marginBottom: '10px' }}>
            <button
              onClick={() => setShowNodeManager(!showNodeManager)}
              style={{
                background: '#9C27B0',
                color: 'white',
                border: 'none',
                padding: '6px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                width: '100%',
                marginBottom: '8px'
              }}
            >
              {showNodeManager ? 'Hide' : 'Show'} Node Manager
            </button>
            
            <button
              onClick={() => setShowOnlyExpenses(!showOnlyExpenses)}
              style={{
                background: showOnlyExpenses ? '#FF5722' : '#795548',
                color: 'white',
                border: 'none',
                padding: '6px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                width: '100%'
              }}
            >
              {showOnlyExpenses ? 'Show All Nodes' : 'Show Only Expenses'}
            </button>
          </div>
          
          {showNodeManager && (
            <div>
              {/* Add Node */}
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '12px', marginBottom: '5px', color: '#aaa' }}>Add New Node</div>
                <div style={{ marginBottom: '8px' }}>
                  <input
                    type="text"
                    placeholder="Node ID"
                    value={newNodeId}
                    onChange={(e) => setNewNodeId(e.target.value)}
                    style={{
                      width: '120px',
                      padding: '4px 6px',
                      borderRadius: '3px',
                      border: '1px solid #555',
                      background: '#333',
                      color: 'white',
                      fontSize: '11px',
                      marginRight: '8px'
                    }}
                  />
                  <select
                    value={newNodeGroup}
                    onChange={(e) => setNewNodeGroup(e.target.value)}
                    style={{
                      padding: '4px',
                      borderRadius: '3px',
                      border: '1px solid #555',
                      background: '#333',
                      color: 'white',
                      fontSize: '11px',
                      width: '60px'
                    }}
                  >
                    {[1,2,3,4,5,6,7,8,9,10].map(group => (
                      <option key={group} value={group}>Group {group}</option>
                    ))}
                  </select>
                  <select
                    value={newNodeCategory}
                    onChange={(e) => {
                      const category = e.target.value;
                      setNewNodeCategory(category);
                      console.log('Category changed to:', category);
                      // Reset price and month when category changes
                      if (category !== 'expenses') {
                        setNewNodePrice(0);
                        setNewNodeMonth('');
                      }
                    }}
                    style={{
                      padding: '4px',
                      borderRadius: '3px',
                      border: '1px solid #555',
                      background: '#333',
                      color: 'white',
                      fontSize: '11px',
                      width: '100%',
                      marginTop: '8px'
                    }}
                  >
                    {Object.keys(categories).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                {newNodeCategory === 'expenses' && (
                  <div style={{ marginTop: '8px' }}>
                    <input
                      type="number"
                      placeholder="Price"
                      value={newNodePrice}
                      onChange={(e) => setNewNodePrice(parseFloat(e.target.value) || 0)}
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
                    />
                    <select
                      value={newNodeMonth}
                      onChange={(e) => setNewNodeMonth(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        borderRadius: '3px',
                        border: '1px solid #555',
                        background: '#333',
                        color: 'white',
                        fontSize: '11px'
                      }}
                    >
                      <option value="">Select Month</option>
                      {months.map(month => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', marginBottom: '5px', color: '#aaa' }}>Energy Consumption:</label>
                  <select
                    value={newNodeEnergy}
                    onChange={(e) => setNewNodeEnergy(e.target.value)}
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
                    <option value="">Select Energy Level</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', marginBottom: '5px', color: '#aaa' }}>Time Consumption:</label>
                  <select
                    value={newNodeTime}
                    onChange={(e) => setNewNodeTime(e.target.value)}
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
                    <option value="">Select Time</option>
                    <option value="30 minutes">30 minutes</option>
                    <option value="1 hour">1 hour</option>
                    <option value="2 hours">2 hours</option>
                    <option value="3 hours">3 hours</option>
                  </select>
                </div>

                <button
                  onClick={addNode}
                  style={{
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    width: '100%'
                  }}
                >
                  Add Node
                </button>
              </div>

              {/* Add Link */}
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '12px', marginBottom: '5px', color: '#aaa' }}>Add New Link</div>
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
                      fontSize: '11px'
                    }}
                  >
                    <option value="">Select Target Node</option>
                    {graphData.nodes.map(node => (
                      <option key={node.id} value={node.id}>{node.id}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => {
                    if (sourceNodeId && targetNodeId) {
                      addLink(sourceNodeId, targetNodeId)
                      setSourceNodeId("")
                      setTargetNodeId("")
                    } else {
                      alert("Please select both source and target nodes.")
                    }
                  }}
                  style={{
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    width: '100%'
                  }}
                >
                  Add Link
                </button>
              </div>

              {/* Delete Node */}
              <div>
                <div style={{ fontSize: '12px', marginBottom: '5px', color: '#aaa' }}>Delete Node</div>
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
                      fontSize: '11px'
                    }}
                  >
                    <option value="">Select node to delete</option>
                    {graphData.nodes.map(node => (
                      <option key={node.id} value={node.id}>{node.id}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={deleteNode}
                  style={{
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    width: '100%'
                  }}
                >
                  Delete Node
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Expense Summary Panel */}
      {Object.keys(monthlyExpenseSummary).length > 0 && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.9)',
          padding: '15px',
          borderRadius: '8px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          minWidth: '200px'
        }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Monthly Expenses</h3>
          {Object.entries(monthlyExpenseSummary).map(([month, total]) => (
            <div key={month} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginBottom: '8px',
              fontSize: '12px'
            }}>
              <span>{month}:</span>
              <span style={{ color: '#FF6B6B', fontWeight: 'bold' }}>${total.toFixed(2)}</span>
            </div>
          ))}
          <div style={{ 
            borderTop: '1px solid #444', 
            paddingTop: '8px', 
            marginTop: '8px',
            display: 'flex', 
            justifyContent: 'space-between',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            <span>Total:</span>
            <span style={{ color: '#FF6B6B' }}>
              ${Object.values(monthlyExpenseSummary).reduce((sum, val) => sum + val, 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* 3D Force Graph */}
      <ForceGraph3D
        ref={graphRef}
        graphData={getFilteredGraphData()}
        nodeLabel="id"
        nodeAutoColorBy="group"
        nodeColor={node => categories[node.category]?.color || categories['default'].color} // Use category color
        linkThreeObjectExtend={true}
        linkThreeObject={link => {
          const sprite = new SpriteText(`${getLinkSourceId(link)} > ${getLinkTargetId(link)}`)
          sprite.color = link.color || "#F0F0F0"
          sprite.textHeight = 1.5
          return sprite
        }}
        linkWidth={link => link.thickness || 1}
        linkPositionUpdate={(sprite, { start, end }) => {
          const middlePos = Object.assign(...["x", "y", "z"].map(c => ({
            [c]: start[c] + (end[c] - start[c]) / 2
          })))
          Object.assign(sprite.position, middlePos)
        }}
        onNodeDrag={node => {
          // Update node position during drag
          if (graphRef.current) {
            // Restart simulation with low alpha to update link positions
            graphRef.current.d3Force("alphaTarget", 0.1).restart()
          }
        }}
        onNodeDragEnd={node => {
          node.fx = node.x
          node.fy = node.y
          node.fz = node.z
          // Re-heat simulation to update link positions
          if (graphRef.current) {
            graphRef.current.d3Force("alphaTarget", 0.3).restart()
            setTimeout(() => {
              graphRef.current.d3Force("alphaTarget", 0)
            }, 1000)
          }
        }}
        onNodeClick={node => {
          setSelectedNodeId(node.id)
          setSelectedNodeColor(node.color || categories[node.category]?.color || categories['default'].color)
          setSelectedNodeTextSize(node.textSize || 6)
          setSelectedNodeCategory(node.category || 'default') // Set selected node category
          setSelectedNodePrice(node.price || 0) // Set selected node price
          setSelectedNodeMonth(node.month || "") // Set selected node month
          setSelectedNodeEnergy(node.energy || "") // Set selected node energy
          setSelectedNodeTime(node.time || "") // Set selected node time
          console.log("Selected node:", node.id)}}
        onLinkClick={link => {
          setSelectedLinkId(link)
          setSelectedLinkColor(link.color || "#F0F0F0")
          setSelectedLinkThickness(link.thickness || 1)
          console.log("Selected link:", link)
        }}
        nodeThreeObject={node => {
          const sprite = new SpriteText(node.id)
          sprite.material.depthWrite = false
          sprite.color = selectedNodeId === node.id ? "#ffff00" : (categories[node.category]?.color || categories['default'].color) // Use category color
          sprite.textHeight = selectedNodeId === node.id ? (node.textSize || 6) + 2 : (node.textSize || 6)
          return sprite
        }}
        backgroundColor="#000011"
      />
    </div>
  )
}

export default App

