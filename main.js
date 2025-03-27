// main.js
document.addEventListener('DOMContentLoaded', function() {
    // Initialize data structure
    const mindMapData = {
        nodes: {},
        connections: []
    };
    
    // Create initial root node
    createRootNode();
    
    // Make the background draggable for panning
    makeDraggable(document.querySelector('.mind-map'));
    
    // Set up control buttons
    document.getElementById('zoomIn').addEventListener('click', zoomIn);
    document.getElementById('zoomOut').addEventListener('click', zoomOut);
    document.getElementById('autoLayout').addEventListener('click', autoLayout);
    
    // Remove reset button functionality
    const resetButton = document.getElementById('centerButton');
    if (resetButton) {
        resetButton.parentNode.removeChild(resetButton);
    }
    
    // Node form handlers
    document.getElementById('saveNodeBtn').addEventListener('click', saveNodeForm);
    document.getElementById('cancelNodeBtn').addEventListener('click', hideNodeForm);
    
    // Question form handlers
    document.getElementById('saveQuestionBtn').addEventListener('click', saveQuestionForm);
    document.getElementById('cancelQuestionBtn').addEventListener('click', hideQuestionForm);
    
    // Hide expanded node when clicking elsewhere
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.node') && !e.target.closest('.node-form') && !e.target.closest('.question-form')) {
            collapseAllNodes();
        }
    });
    
    // Function to create the initial root node
    function createRootNode() {
        const mindMap = document.querySelector('.mind-map');
        const rootId = 'root';
        
        // Calculate center position
        const containerWidth = 2400;
        const containerHeight = 1600;
        const centerX = containerWidth / 2;
        const centerY = containerHeight / 2;
        
        // Create root node data
        mindMapData.nodes[rootId] = {
            id: rootId,
            title: '',
            type: 'root',
            children: [],
            depth: 0,
            position: { top: centerY, left: centerX }
        };
        
        // Create root node element
        const rootElement = document.createElement('div');
        rootElement.id = rootId;
        rootElement.className = 'node root';
        rootElement.style.top = `${mindMapData.nodes[rootId].position.top}px`;
        rootElement.style.left = `${mindMapData.nodes[rootId].position.left}px`;
        
        // Add title input field
        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.className = 'title-input';
        titleInput.placeholder = 'Enter root node name';
        titleInput.addEventListener('blur', function() {
            mindMapData.nodes[rootId].title = this.value;
        });
        rootElement.appendChild(titleInput);
        
        // Add score element (initially hidden)
        const scoreElement = document.createElement('div');
        scoreElement.className = 'score high';
        scoreElement.textContent = '0%';
        scoreElement.style.display = 'none'; // Initially hidden
        rootElement.appendChild(scoreElement);
        
        // Add + button for adding children
        const addButton = document.createElement('div');
        addButton.className = 'add-button';
        addButton.innerHTML = '<i class="fas fa-plus"></i>';
        addButton.addEventListener('click', function(e) {
            e.stopPropagation();
            showNodeForm(rootId);
        });
        rootElement.appendChild(addButton);
        
        // Make node draggable
        makeNodeDraggable(rootElement);
        
        mindMap.appendChild(rootElement);
    }
    
    // Function to show the node form
    function showNodeForm(parentId) {
        const overlay = document.getElementById('nodeFormOverlay');
        const form = overlay.querySelector('.node-form');
        const formTitle = document.getElementById('formTitle');
        const nodeNameInput = document.getElementById('nodeName');
        
        // Reset form
        formTitle.textContent = 'Add New Node';
        nodeNameInput.value = '';
        
        // Store parent ID
        form.dataset.parentId = parentId;
        
        // Show form
        overlay.style.display = 'flex';
        nodeNameInput.focus();
    }
    
    // Function to hide the node form
    function hideNodeForm() {
        document.getElementById('nodeFormOverlay').style.display = 'none';
    }
    
    // Function to save the node form
    function saveNodeForm() {
        const form = document.querySelector('.node-form');
        const parentId = form.dataset.parentId;
        const nodeName = document.getElementById('nodeName').value.trim();
        const nodeType = document.querySelector('input[name="nodeType"]:checked').value;
        
        if (nodeName) {
            // Create new node
            createNode(parentId, nodeName, nodeType);
            
            // Hide form
            hideNodeForm();
            
            // Update connectors
            drawConnectors();
            
            // Update parent node scores
            updateNodeScores();
        }
    }
    
    // Function to create a new node
    function createNode(parentId, title, type) {
        const mindMap = document.querySelector('.mind-map');
        const parent = mindMapData.nodes[parentId];
        
        // Generate unique ID
        const nodeId = `node_${Date.now()}`;
        
        // Calculate node depth (used for auto-layout)
        const nodeDepth = (parent.depth || 0) + 1;
        
        // Calculate position relative to parent
        const parentElement = document.getElementById(parentId);
        const parentOffsetLeft = parent.position.left;
        const parentOffsetTop = parent.position.top;
        
        // Place node to the right of parent with some randomness
        const offsetX = type === 'directory' ? 250 : 200;
        const offsetY = (Math.random() - 0.5) * 200;
        
        // Create node data
        mindMapData.nodes[nodeId] = {
            id: nodeId,
            title: title,
            type: type,
            parent: parentId,
            depth: nodeDepth,
            children: [],
            questions: [],
            position: {
                top: parentOffsetTop + offsetY,
                left: parentOffsetLeft + offsetX
            }
        };
        
        // Add to parent's children
        parent.children.push(nodeId);
        
        // Create connection
        mindMapData.connections.push({
            from: parentId,
            to: nodeId
        });
        
        // Create node element
        const nodeElement = document.createElement('div');
        nodeElement.id = nodeId;
        nodeElement.className = `node ${type}`;
        nodeElement.style.top = `${mindMapData.nodes[nodeId].position.top}px`;
        nodeElement.style.left = `${mindMapData.nodes[nodeId].position.left}px`;
        
        // Add title
        const titleElement = document.createElement('div');
        titleElement.className = 'node-title';
        titleElement.textContent = title;
        nodeElement.appendChild(titleElement);
        
        // Add score/fraction display
        if (type === 'directory' || type === 'root') {
            // Directory nodes get score percentage
            const scoreElement = document.createElement('div');
            scoreElement.className = 'score high';
            scoreElement.textContent = '0%';
            nodeElement.appendChild(scoreElement);
            
            // Add + button for adding children
            const addButton = document.createElement('div');
            addButton.className = 'add-button';
            addButton.innerHTML = '<i class="fas fa-plus"></i>';
            addButton.addEventListener('click', function(e) {
                e.stopPropagation();
                showNodeForm(nodeId);
            });
            nodeElement.appendChild(addButton);
        } else if (type === 'leaf') {
            // Leaf nodes get fraction display
            const fractionElement = document.createElement('div');
            fractionElement.className = 'fraction';
            fractionElement.textContent = '0/0';
            fractionElement.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleQuestionsDisplay(nodeId);
            });
            nodeElement.appendChild(fractionElement);
            
            // Add questions list (initially hidden)
            const questionsList = document.createElement('div');
            questionsList.className = 'questions-list';
            questionsList.innerHTML = '<div class="no-questions">No questions added</div>';
            
            // Add "Add Question" button
            const addQuestionBtn = document.createElement('button');
            addQuestionBtn.className = 'add-question-btn';
            addQuestionBtn.textContent = 'Add Question';
            addQuestionBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                showQuestionForm(nodeId);
            });
            questionsList.appendChild(addQuestionBtn);
            
            nodeElement.appendChild(questionsList);
        }
        
        // Make node draggable
        makeNodeDraggable(nodeElement);
        
        mindMap.appendChild(nodeElement);
    }
    
    // Function to toggle questions display for leaf nodes
    function toggleQuestionsDisplay(nodeId) {
        const node = document.getElementById(nodeId);
        const questionsList = node.querySelector('.questions-list');
        
        if (questionsList.classList.contains('visible')) {
            // Collapse
            questionsList.classList.remove('visible');
            node.classList.remove('expanded');
        } else {
            // Expand
            collapseAllNodes();
            questionsList.classList.add('visible');
            node.classList.add('expanded');
        }
        
        // Redraw connectors after expanding/collapsing
        drawConnectors();
    }
    
    // Function to collapse all expanded nodes
    function collapseAllNodes() {
        document.querySelectorAll('.node.expanded').forEach(node => {
            node.classList.remove('expanded');
            const questionsList = node.querySelector('.questions-list');
            if (questionsList) {
                questionsList.classList.remove('visible');
            }
        });
        
        // Redraw connectors
        drawConnectors();
    }
    
    // Show question form
    function showQuestionForm(nodeId) {
        const overlay = document.getElementById('questionFormOverlay');
        const form = overlay.querySelector('.question-form');
        const questionInput = document.getElementById('questionText');
        
        // Reset form
        questionInput.value = '';
        
        // Store node ID
        form.dataset.nodeId = nodeId;
        
        // Show form
        overlay.style.display = 'flex';
        questionInput.focus();
    }
    
    // Hide question form
    function hideQuestionForm() {
        document.getElementById('questionFormOverlay').style.display = 'none';
    }
    
    // Save question form
    function saveQuestionForm() {
        const form = document.querySelector('.question-form');
        const nodeId = form.dataset.nodeId;
        const questionText = document.getElementById('questionText').value.trim();
        
        if (questionText) {
            // Add question to the node
            addQuestion(nodeId, questionText);
            
            // Hide form
            hideQuestionForm();
            
            // Update scores
            updateNodeScores();
        }
    }
    
    // Add question to a leaf node
    function addQuestion(nodeId, questionText) {
        const node = mindMapData.nodes[nodeId];
        
        if (node && node.type === 'leaf') {
            // Create question object
            const questionId = `q_${Date.now()}`;
            const question = {
                id: questionId,
                text: questionText,
                isCorrect: false
            };
            
            // Add to node's questions
            if (!node.questions) {
                node.questions = [];
            }
            node.questions.push(question);
            
            // Update the questions list UI
            updateQuestionsListUI(nodeId);
        }
    }
    
    // Update the questions list UI
    function updateQuestionsListUI(nodeId) {
        const nodeElement = document.getElementById(nodeId);
        const questionsListElement = nodeElement.querySelector('.questions-list');
        const node = mindMapData.nodes[nodeId];
        
        if (node.questions && node.questions.length > 0) {
            // Clear current list
            questionsListElement.innerHTML = '';
            
            // Add each question
            node.questions.forEach(question => {
                const questionItem = document.createElement('div');
                questionItem.className = 'question-item';
                questionItem.dataset.id = question.id;
                
                const questionText = document.createElement('div');
                questionText.className = 'question-text';
                questionText.textContent = question.text;
                questionItem.appendChild(questionText);
                
                const questionActions = document.createElement('div');
                questionActions.className = 'question-actions';
                
                // Correct button
                const correctBtn = document.createElement('button');
                correctBtn.className = 'correct-btn';
                correctBtn.title = 'Mark as correct';
                correctBtn.innerHTML = '<i class="fas fa-check"></i>';
                correctBtn.dataset.status = question.isCorrect ? 'active' : 'inactive';
                correctBtn.style.opacity = question.isCorrect ? '1' : '0.5';
                correctBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    toggleQuestionCorrect(nodeId, question.id, true);
                });
                questionActions.appendChild(correctBtn);
                
                // Wrong button
                const wrongBtn = document.createElement('button');
                wrongBtn.className = 'wrong-btn';
                wrongBtn.title = 'Mark as wrong';
                wrongBtn.innerHTML = '<i class="fas fa-times"></i>';
                wrongBtn.dataset.status = question.isCorrect ? 'inactive' : 'active';
                wrongBtn.style.opacity = question.isCorrect ? '0.5' : '1';
                wrongBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    toggleQuestionCorrect(nodeId, question.id, false);
                });
                questionActions.appendChild(wrongBtn);
                
                questionItem.appendChild(questionActions);
                questionsListElement.appendChild(questionItem);
            });
            
            // Add "Add Question" button
            const addQuestionBtn = document.createElement('button');
            addQuestionBtn.className = 'add-question-btn';
            addQuestionBtn.textContent = 'Add Question';
            addQuestionBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                showQuestionForm(nodeId);
            });
            questionsListElement.appendChild(addQuestionBtn);
            
            // Update fraction display
            updateNodeFraction(nodeId);
        } else {
            questionsListElement.innerHTML = '<div class="no-questions">No questions added</div>';
            
            // Add "Add Question" button
            const addQuestionBtn = document.createElement('button');
            addQuestionBtn.className = 'add-question-btn';
            addQuestionBtn.textContent = 'Add Question';
            addQuestionBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                showQuestionForm(nodeId);
            });
            questionsListElement.appendChild(addQuestionBtn);
            
            // Reset fraction display
            const fractionElement = nodeElement.querySelector('.fraction');
            if (fractionElement) {
                fractionElement.textContent = '0/0';
            }
        }
    }
    
    // Toggle question correct/incorrect
    function toggleQuestionCorrect(nodeId, questionId, isCorrect) {
        const node = mindMapData.nodes[nodeId];
        
        if (node && node.questions) {
            // Find and update the question
            const question = node.questions.find(q => q.id === questionId);
            if (question) {
                question.isCorrect = isCorrect;
                
                // Update UI
                updateQuestionsListUI(nodeId);
                
                // Update scores
                updateNodeScores();
            }
        }
    }
    
    // Update fraction display for a node
    function updateNodeFraction(nodeId) {
        const node = mindMapData.nodes[nodeId];
        const nodeElement = document.getElementById(nodeId);
        const fractionElement = nodeElement.querySelector('.fraction');
        
        if (node && node.questions && fractionElement) {
            const totalQuestions = node.questions.length;
            const correctQuestions = node.questions.filter(q => q.isCorrect).length;
            
            fractionElement.textContent = `${correctQuestions}/${totalQuestions}`;
            
            // Add score if there are at least 10 questions
            let scoreElement = nodeElement.querySelector('.score');
            
            if (totalQuestions >= 10) {
                const scoreValue = Math.round((correctQuestions / totalQuestions) * 100);
                
                if (!scoreElement) {
                    scoreElement = document.createElement('div');
                    scoreElement.className = 'score';
                    nodeElement.appendChild(scoreElement);
                }
                
                // Update class based on score
                scoreElement.className = 'score';
                if (scoreValue >= 80) {
                    scoreElement.classList.add('high');
                } else if (scoreValue >= 60) {
                    scoreElement.classList.add('medium');
                } else {
                    scoreElement.classList.add('low');
                }
                
                scoreElement.textContent = `${scoreValue}%`;
                scoreElement.style.display = 'block';
            } else if (scoreElement) {
                scoreElement.style.display = 'none';
            }
        }
    }
    
    // Update scores for all directory and root nodes
    function updateNodeScores() {
        // First, calculate scores for each leaf node
        for (const nodeId in mindMapData.nodes) {
            const node = mindMapData.nodes[nodeId];
            if (node.type === 'leaf' && node.questions) {
                node.correctCount = node.questions.filter(q => q.isCorrect).length;
                node.totalCount = node.questions.length;
            }
        }
        
        // Then update directory nodes and root
        function calculateDirectoryScore(nodeId) {
            const node = mindMapData.nodes[nodeId];
            let totalCorrect = 0;
            let totalQuestions = 0;
            
            // Get scores from children
            for (const childId of node.children || []) {
                const childNode = mindMapData.nodes[childId];
                
                if (childNode.type === 'leaf') {
                    totalCorrect += childNode.correctCount || 0;
                    totalQuestions += childNode.totalCount || 0;
                } else {
                    // Recursively calculate child directory scores
                    const childScore = calculateDirectoryScore(childId);
                    totalCorrect += childScore.correctCount;
                    totalQuestions += childScore.totalCount;
                }
            }
            
            // Save the calculated scores in the node
            node.correctCount = totalCorrect;
            node.totalCount = totalQuestions;
            
            // Update the UI for this directory node
            updateDirectoryScoreUI(nodeId);
            
            // Return the score for parent calculations
            return { 
                correctCount: totalCorrect, 
                totalCount: totalQuestions 
            };
        }
        
        // Start calculation from the root
        if (mindMapData.nodes.root) {
            calculateDirectoryScore('root');
        }
    }
    
    // Update the score UI for a directory or root node
    function updateDirectoryScoreUI(nodeId) {
        const node = mindMapData.nodes[nodeId];
        const nodeElement = document.getElementById(nodeId);
        const scoreElement = nodeElement.querySelector('.score');
        
        if (node && scoreElement) {
            const totalQuestions = node.totalCount || 0;
            const correctQuestions = node.correctCount || 0;
            
            // Only show score if there are questions
            if (totalQuestions > 0) {
                const scoreValue = Math.round((correctQuestions / totalQuestions) * 100);
                
                // Update class based on score
                scoreElement.className = 'score';
                if (scoreValue >= 80) {
                    scoreElement.classList.add('high');
                } else if (scoreValue >= 60) {
                    scoreElement.classList.add('medium');
                } else {
                    scoreElement.classList.add('low');
                }
                
                scoreElement.textContent = `${scoreValue}%`;
                scoreElement.style.display = 'block';
            } else {
                scoreElement.style.display = 'none';
            }
        }
    }
    
    // Function to draw connectors between nodes
    function drawConnectors() {
        // Remove existing connectors
        document.querySelectorAll('.connector').forEach(el => el.remove());
        
        // Create each connector
        mindMapData.connections.forEach(conn => {
            createConnector(conn.from, conn.to);
        });
    }
    
    function createConnector(fromId, toId) {
        const from = document.getElementById(fromId);
        const to = document.getElementById(toId);
        
        if (!from || !to) return;
        
        const mindMap = document.querySelector('.mind-map');
        
        // Calculate center points
        const fromX = from.offsetLeft + from.offsetWidth / 2;
        const fromY = from.offsetTop + from.offsetHeight / 2;
        const toX = to.offsetLeft + to.offsetWidth / 2;
        const toY = to.offsetTop + to.offsetHeight / 2;
        
        // Calculate distance and angle
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        // Create connector
        const connector = document.createElement('div');
        connector.className = 'connector';
        connector.style.width = `${distance}px`;
        connector.style.left = `${fromX}px`;
        connector.style.top = `${fromY}px`;
        connector.style.transform = `rotate(${angle}deg)`;
        
        // Store reference to connected nodes
        connector.dataset.from = fromId;
        connector.dataset.to = toId;
        
        mindMap.appendChild(connector);
    }
    
    // Make the background draggable for panning
    function makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        let isDragging = false;
        
        element.addEventListener('mousedown', dragMouseDown);
        
        function dragMouseDown(e) {
            // If we're clicking on a node or form, don't drag the background
            if (e.target.closest('.node') || 
                e.target.closest('.node-form') || 
                e.target.closest('.question-form') ||
                e.target.closest('.add-button')) return;
            
            e.preventDefault();
            isDragging = true;
            
            // Get the mouse cursor position at startup
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            document.addEventListener('mousemove', elementDrag);
            document.addEventListener('mouseup', closeDragElement);
        }
        
        function elementDrag(e) {
            if (!isDragging) return;
            
            e.preventDefault();
            // Calculate the new cursor position
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            // Set the element's new position
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        }
        
        function closeDragElement() {
            // Stop moving when mouse button is released
            isDragging = false;
            document.removeEventListener('mousemove', elementDrag);
            document.removeEventListener('mouseup', closeDragElement);
        }
    }
    
    // Make individual nodes draggable - FIXED VERSION
    function makeNodeDraggable(nodeElement) {
        let startX, startY;
        let startTop, startLeft;
        let isDragging = false;
        
        nodeElement.addEventListener('mousedown', dragStart);
        
        function dragStart(e) {
            // Don't start dragging if clicking on buttons or question list
            if (e.target.closest('.add-button') || 
                e.target.closest('.questions-list') ||
                e.target.closest('.add-question-btn') ||
                e.target.closest('.title-input')) {
                return;
            }
            
            e.stopPropagation();
            e.preventDefault();
            
            isDragging = true;
            nodeElement.classList.add('dragging');
            
            // Store initial mouse position
            startX = e.clientX;
            startY = e.clientY;
            
            // Store initial node position
            startTop = nodeElement.offsetTop;
            startLeft = nodeElement.offsetLeft;
            
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);
        }
        
        function drag(e) {
            if (!isDragging) return;
            
            e.preventDefault();
            
            // Calculate how far the mouse has moved
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            // Set the node's new position relative to its starting position
            const newTop = startTop + deltaY;
            const newLeft = startLeft + deltaX;
            
            nodeElement.style.top = `${newTop}px`;
            nodeElement.style.left = `${newLeft}px`;
            
            // Update data model
            const nodeId = nodeElement.id;
            if (mindMapData.nodes[nodeId]) {
                mindMapData.nodes[nodeId].position = {
                    top: newTop,
                    left: newLeft
                };
            }
            
            // Update connectors in real-time
            drawConnectors();
        }
        
        function dragEnd() {
            // Stop moving when mouse button is released
            isDragging = false;
            nodeElement.classList.remove('dragging');
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', dragEnd);
            
            // Final update of connectors
            drawConnectors();
        }
    }
    
    // Zoom functionality
    let currentScale = 1;
    
    function zoomIn() {
        currentScale += 0.1;
        applyZoom();
    }
    
    function zoomOut() {
        currentScale = Math.max(0.5, currentScale - 0.1);
        applyZoom();
    }
    
    function applyZoom() {
        const mindMap = document.querySelector('.mind-map');
        mindMap.style.transform = `scale(${currentScale})`;
        
        // Collapse all nodes when zooming
        collapseAllNodes();
        
        // Redraw connectors after zoom
        drawConnectors();
    }
    
    // Improved auto layout that considers node depth and prevents overlapping
    function autoLayout() {
        // Get root node
        const rootNode = mindMapData.nodes.root;
        if (!rootNode) return;
        
        // Center of the container
        const containerWidth = 2400;
        const containerHeight = 1600;
        const centerX = containerWidth / 2;
        const centerY = containerHeight / 2;
        
        // Update root node position
        rootNode.position = { top: centerY, left: centerX };
        const rootElement = document.getElementById('root');
        rootElement.style.top = `${centerY}px`;
        rootElement.style.left = `${centerX}px`;
        
        // Create a map to store nodes by depth
        const nodesByDepth = {};
        
        // Organize nodes by depth level
        for (const nodeId in mindMapData.nodes) {
            if (nodeId === 'root') continue;
            
            const node = mindMapData.nodes[nodeId];
            const depth = node.depth || 1;
            
            if (!nodesByDepth[depth]) {
                nodesByDepth[depth] = [];
            }
            
            nodesByDepth[depth].push(nodeId);
        }
        
        // Layout each depth level
        for (const depth in nodesByDepth) {
            const nodesAtDepth = nodesByDepth[depth];
            const nodesCount = nodesAtDepth.length;
            
            // Base radius for this depth level - increases with depth
            const baseRadius = depth * 250;
            
            // Angle step for distributing nodes
            const angleStep = (2 * Math.PI) / nodesCount;
            
            // Position each node at this depth
            nodesAtDepth.forEach((nodeId, index) => {
                const node = mindMapData.nodes[nodeId];
                const angle = index * angleStep;
                
                // Calculate position based on angle and radius
                const x = centerX + baseRadius * Math.cos(angle);
                const y = centerY + baseRadius * Math.sin(angle);
                
                // Update node position in data model
                node.position = { top: y, left: x };
                
                // Update node position in DOM
                const nodeElement = document.getElementById(nodeId);
                if (nodeElement) {
                    nodeElement.style.top = `${y}px`;
                    nodeElement.style.left = `${x}px`;
                }
            });
        }
        
        // Collapse all nodes when auto-layout
        collapseAllNodes();
        
        // Update connectors
        drawConnectors();
    }
});