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
    #status-container {
        position: absolute;
        top: 10px;
        left: 10px;
        z-index: 1000;
        padding: 8px 16px;
        font-size: 16px;
        color: #fff;
        background-color: rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        backdrop-filter: blur(5px);
    }
    #download-link {
        color: #87CEEB; /* A light blue color to make it stand out */
        text-decoration: underline;
        cursor: pointer;
    }
  </style>

  <!-- Main library for the 3D force graph -->
  <script src="//cdn.jsdelivr.net/npm/3d-force-graph"></script>
</head>

<body>
  <div id="3d-graph"></div>
  <div id="status-container">
    <span id="status-message"></span>
    <a id="download-link" href="#">Download Positions</a>
  </div>

  <script type="module">
    // Import a library for creating 3D text labels
    import SpriteText from "https://esm.sh/three-spritetext";

    let downloadUrl = null;

    // Function to generate and update the download link's URL
    const updateDownloadLink = (graph) => {
        // Re-transform the graph data back into the original JSON format
        const currentNodes = graph.graphData().nodes;
        const currentLinks = graph.graphData().links;
        const nodesToSave = [];

        currentNodes.forEach(node => {
            const parentLink = currentLinks.find(link => link.target.id === node.id);
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

        // Convert the data to a JSON string
        const jsonString = JSON.stringify(nodesToSave, null, 2);

        // Revoke the previous URL to free up memory
        if (downloadUrl) {
            URL.revokeObjectURL(downloadUrl);
        }

        // Create a Blob from the JSON string
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // Create a new URL for the Blob
        downloadUrl = URL.createObjectURL(blob);
        document.getElementById('download-link').href = downloadUrl;
    };

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
          .nodeRelSize(0) // This sets the sphere size to zero
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
          // Set this to false to only render the custom object (the text)
          .nodeThreeObjectExtend(false) 
          .linkWidth(1);

        // Pin the node's position after it is dragged and update the download link
        Graph.onNodeDragEnd(node => {
            node.fx = node.x;
            node.fy = node.y;
            node.fz = node.z;
            updateDownloadLink(Graph);
        });
        
        // Adjust the force strength to spread nodes out a little more
        Graph.d3Force('charge').strength(-250);

        // Initialize the download link for the first time
        updateDownloadLink(Graph);
      })
      .catch(error => {
        console.error("Failed to load graph data:", error);
        alert("Failed to load initial graph data. Please ensure 'nodePositions.json' is accessible.");
      });
  </script>
</body>
</html>
