<!DOCTYPE html>
<html>
<head>
  <title>Interactive 3D Graph</title>
  <style>
    body {
      margin: 0;
      overflow: hidden; /* Prevent scroll bars */
    }
    #3d-graph {
      width: 100vw;
      height: 100vh;
      background-color: #000;
    }
    #save-button {
      position: absolute;
      top: 10px;
      left: 10px;
      z-index: 1000;
      padding: 8px 16px;
      font-size: 16px;
      cursor: pointer;
      border-radius: 8px;
      border: 1px solid #fff;
      background-color: rgba(255, 255, 255, 0.2);
      color: #fff;
      backdrop-filter: blur(5px);
    }
    #save-button:hover {
        background-color: rgba(255, 255, 255, 0.4);
    }
  </style>

  <!-- Main library for the 3D force graph -->
  <script src="//cdn.jsdelivr.net/npm/3d-force-graph"></script>
</head>

<body>
  <div id="3d-graph"></div>
  <button id="save-button">Save Positions</button>

  <script type="module">
    // Import a library for creating 3D text labels
    import SpriteText from "https://esm.sh/three-spritetext";

    // Fetch the graph data from the nodePositions.json file
    fetch('nodePositions.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(rawNodeData => {
        // Transform the raw data into the format required by 3d-force-graph
        const transformedData = {
          nodes: [],
          links: []
        };

        // Populate the nodes and links arrays
        rawNodeData.forEach(item => {
          // Add each item as a node, using 'label' as the display name
          // and assigning a 'group' for automatic coloring
          transformedData.nodes.push({
            id: item.id,
            name: item.label,
            group: item.parent ? 2 : 1
          });

          // If the node has a parent, create a link
          if (item.parent) {
            transformedData.links.push({
              source: item.parent,
              target: item.id
            });
          }
        });
        
        // Initialize the 3D Force Graph with the transformed data
        const Graph = new ForceGraph3D(document.getElementById('3d-graph'))
          .graphData(transformedData)
          .nodeAutoColorBy('group')
          .nodeRelSize(0) // This is the new change to hide the spheres
          .nodeThreeObject(node => {
            // Create the text sprite for the label
            const sprite = new SpriteText(node.name || node.id);
            sprite.material.depthWrite = false;
            sprite.color = node.color;
            sprite.textHeight = 8;
            
            // Return a Group to hold the text, which replaces the default sphere
            const group = new Graph.three.Group();
            group.add(sprite);
            return group;
          })
          .nodeThreeObjectExtend(true)
          .linkWidth(1);

        // Pin the node's position after it is dragged.
        Graph.onNodeDragEnd(node => {
            node.fx = node.x;
            node.fy = node.y;
            node.fz = node.z;
        });
        
        // Adjust the force strength to spread nodes out a little more
        Graph.d3Force('charge').strength(-250);

        // Function to save the current node positions
        const saveNodePositions = () => {
            // Re-transform the graph data back into the original JSON format
            const currentNodes = Graph.graphData().nodes;
            const currentLinks = Graph.graphData().links;
            const nodesToSave = [];

            currentNodes.forEach(node => {
                const parentLink = currentLinks.find(link => link.target === node.id);
                const parentId = parentLink ? parentLink.source.id : undefined;

                nodesToSave.push({
                    id: node.id,
                    label: node.name,
                    x: node.x,
                    y: node.y,
                    z: node.z,
                    parent: parentId
                });
            });

            // Use fetch to send the data to a server endpoint
            // NOTE: This will not work without a server-side component (like a Vercel Function)
            fetch('/save-nodes', { // Replace '/save-nodes' with your actual serverless function endpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(nodesToSave)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Save failed. A server-side function is required to handle the request.');
                }
                return response.json();
            })
            .then(data => {
                console.log('Positions saved successfully:', data);
                alert('Positions saved successfully!');
            })
            .catch(error => {
                console.error('Error saving positions:', error);
                alert('Error saving positions: ' + error.message);
            });
        };

        // Add event listener to the button
        document.getElementById('save-button').addEventListener('click', saveNodePositions);
      })
      .catch(error => {
        console.error("Failed to load graph data:", error);
        alert("Failed to load initial graph data. Please ensure 'nodePositions.json' is accessible.");
      });
  </script>
</body>
</html>
