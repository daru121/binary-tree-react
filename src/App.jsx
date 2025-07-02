import { useState, useEffect, useRef } from 'react';
import './App.css';

class TreeNode {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
    this.x = 0;
    this.y = 0;
    this.level = 0;
  }
}

class BinaryTree {
  constructor() {
    this.root = null;
    this.nodeElements = new Map();
    this.edges = [];
    this.isAnimating = false;
  }

  compareValues(a, b) {
    if (!isNaN(a) && !isNaN(b)) {
      return Number(a) - Number(b);
    }
    return String(a).localeCompare(String(b));
  }

  insert(value) {
    if (this.isAnimating) return;
    
    const newNode = new TreeNode(value);

    if (!this.root) {
      this.root = newNode;
      newNode.level = 1;
    } else {
      this._insertNode(this.root, newNode, 1);
    }
  }

  _insertNode(node, newNode, level) {
    newNode.level = level + 1;
    
    if (this.compareValues(newNode.value, node.value) < 0) {
      if (node.left === null) {
        node.left = newNode;
      } else {
        this._insertNode(node.left, newNode, level + 1);
      }
    } else {
      if (node.right === null) {
        node.right = newNode;
      } else {
        this._insertNode(node.right, newNode, level + 1);
      }
    }
  }

  updatePositions(containerWidth, containerHeight) {
    if (!this.root) return;

    const getSpacing = () => {
      if (window.innerWidth < 640) return 50;
      if (window.innerWidth < 768) return 65;
      return 80;
    };

    const spacing = getSpacing();
    const topMargin = Math.min(50, spacing * 0.625);

    const updateNodePosition = (node, x, y, level) => {
      if (!node) return;

      node.x = x;
      node.y = y;
      node.level = level;

      const levelSpacing = Math.min(
        containerWidth / Math.pow(2, level + 1),
        spacing * 2
      );

      const minSpacing = window.innerWidth < 640 ? 30 : 40;
      const actualSpacing = Math.max(levelSpacing, minSpacing);

      updateNodePosition(node.left, x - actualSpacing, y + spacing, level + 1);
      updateNodePosition(node.right, x + actualSpacing, y + spacing, level + 1);
    };

    updateNodePosition(this.root, containerWidth / 2, topMargin, 1);
  }
}

function App() {
  const [tree] = useState(() => new BinaryTree());
  const [nodeValue, setNodeValue] = useState('');
  const [traversalResult, setTraversalResult] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const visualizationRef = useRef(null);
  const fullscreenModalRef = useRef(null);
  const isDraggingRef = useRef(false);
  const lastPositionRef = useRef({ x: 0, y: 0 });

  // Pan functionality
  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    lastPositionRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    
    const newX = e.clientX - lastPositionRef.current.x;
    const newY = e.clientY - lastPositionRef.current.y;
    
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Zoom functionality
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev / 1.2, 0.5));
  };

  const handleZoomReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Handle wheel zoom
  const handleWheel = (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale(prev => Math.max(0.5, Math.min(prev * delta, 3)));
    }
  };

  useEffect(() => {
    const visualization = visualizationRef.current;
    if (visualization) {
      visualization.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (visualization) {
        visualization.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddNode();
    }
  };

  const handleAddNode = () => {
    const value = nodeValue.trim();
    if (value !== '') {
      tree.insert(value);
      setNodeValue('');
      updateTreePositions();
    }
  };

  const handleReset = () => {
    tree.root = null;
    tree.isAnimating = false;
    setIsAnimating(false);
    setTraversalResult('');
    updateTreePositions();
  };

  const updateTreePositions = () => {
    if (visualizationRef.current) {
      const { width, height } = visualizationRef.current.getBoundingClientRect();
      tree.updatePositions(width, height);
    }
  };

  useEffect(() => {
    updateTreePositions();
    window.addEventListener('resize', updateTreePositions);
    return () => window.removeEventListener('resize', updateTreePositions);
  }, []);

  const highlightNode = async (node) => {
    if (!node) return;
    const nodeElement = document.querySelector(`[data-value="${node.value}"]`);
    if (nodeElement) {
      createTraversalPath(node.x + 10, node.y + 10);
      nodeElement.classList.add('highlight');
      await new Promise(resolve => setTimeout(resolve, 1000));
      nodeElement.classList.remove('highlight');
    }
  };

  const createTraversalPath = (x, y) => {
    const path = document.createElement('div');
    path.className = 'traversal-path';
    path.style.left = `${x}px`;
    path.style.top = `${y}px`;
    visualizationRef.current.appendChild(path);
    setTimeout(() => path.remove(), 800);
  };

  const performTraversal = async (type) => {
    if (isAnimating || !tree.root) {
      setTraversalResult(tree.root ? 'Sedang dalam proses traversal...' : 'Pohon masih kosong!');
      return;
    }

    setIsAnimating(true);
    tree.isAnimating = true;
    const result = [];

    try {
      if (type === 'inorder') {
        await inorderTraversal(tree.root, result);
      } else if (type === 'preorder') {
        await preorderTraversal(tree.root, result);
      } else if (type === 'postorder') {
        await postorderTraversal(tree.root, result);
      }
    } catch (error) {
      console.error(`Error dalam traversal ${type}:`, error);
      setTraversalResult('Terjadi kesalahan saat traversal');
    } finally {
      setIsAnimating(false);
      tree.isAnimating = false;
    }
  };

  const updateTraversalResult = (type, result) => {
    setTraversalResult(`Traversal ${type}: ${result.join(' → ')}`);
  };

  const inorderTraversal = async (node, result) => {
    if (node) {
      await inorderTraversal(node.left, result);
      result.push(node.value);
      updateTraversalResult('Inorder', result);
      await highlightNode(node);
      await inorderTraversal(node.right, result);
    }
  };

  const preorderTraversal = async (node, result) => {
    if (node) {
      result.push(node.value);
      updateTraversalResult('Preorder', result);
      await highlightNode(node);
      await preorderTraversal(node.left, result);
      await preorderTraversal(node.right, result);
    }
  };

  const postorderTraversal = async (node, result) => {
    if (node) {
      await postorderTraversal(node.left, result);
      await postorderTraversal(node.right, result);
      result.push(node.value);
      updateTraversalResult('Postorder', result);
      await highlightNode(node);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  };

  const renderEdges = (node) => {
    if (!node) return null;
    const edges = [];

    if (node.left) {
      edges.push(
        <div
          key={`${node.value}-${node.left.value}`}
          className="edge"
          style={{
            width: Math.sqrt(Math.pow(node.left.x - node.x, 2) + Math.pow(node.left.y - node.y, 2)),
            left: node.x,
            top: node.y,
            transform: `rotate(${Math.atan2(node.left.y - node.y, node.left.x - node.x)}rad)`,
          }}
        />
      );
      edges.push(...renderEdges(node.left));
    }

    if (node.right) {
      edges.push(
        <div
          key={`${node.value}-${node.right.value}`}
          className="edge"
          style={{
            width: Math.sqrt(Math.pow(node.right.x - node.x, 2) + Math.pow(node.right.y - node.y, 2)),
            left: node.x,
            top: node.y,
            transform: `rotate(${Math.atan2(node.right.y - node.y, node.right.x - node.x)}rad)`,
          }}
        />
      );
      edges.push(...renderEdges(node.right));
    }

    return edges;
  };

  const renderNodes = (node) => {
    if (!node) return null;
    return (
      <>
        <div
          className="node"
          data-value={node.value}
          style={{
            left: node.x - 25,
            top: node.y - 25,
          }}
        >
          {node.value}
        </div>
        {renderNodes(node.left)}
        {renderNodes(node.right)}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-100">
      <div className="min-h-screen p-2 sm:p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-4 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 mb-4 font-poppins tracking-tight">
              Binary Search Tree
            </h1>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-5 gap-4 sm:gap-6">
            {/* Left Panel - Controls */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Input Card */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xl border border-gray-200 hover:shadow-2xl transition-all duration-300">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <i className="fas fa-plus-circle mr-2 text-indigo-600"></i>
                  Tambah Node
                </h2>
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={nodeValue}
                      onChange={(e) => setNodeValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      placeholder="Masukkan nilai node (angka atau huruf)"
                    />
                  </div>
                  <div className="flex gap-2 sm:gap-3">
                    <button
                      onClick={handleAddNode}
                      className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl hover:from-indigo-500 hover:to-indigo-600 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 font-medium shadow-lg"
                    >
                      <i className="fas fa-plus mr-2"></i>
                      <span className="hidden sm:inline">Tambah Node</span>
                      <span className="sm:hidden">Tambah</span>
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-500 hover:to-red-600 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 shadow-lg"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </div>
              </div>

              {/* Traversal Controls */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xl border border-gray-200 hover:shadow-2xl transition-all duration-300">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <i className="fas fa-route mr-2 text-indigo-600"></i>
                  Jenis Traversal
                </h2>
                <div className="space-y-2 sm:space-y-3">
                  <button
                    onClick={() => performTraversal('inorder')}
                    className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl hover:from-emerald-500 hover:to-emerald-600 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 font-medium shadow-lg flex items-center justify-center text-sm sm:text-base"
                  >
                    <i className="fas fa-arrow-right-arrow-left mr-2"></i>
                    Traversal Inorder
                  </button>
                  <button
                    onClick={() => performTraversal('preorder')}
                    className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-500 hover:to-blue-600 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 font-medium shadow-lg flex items-center justify-center text-sm sm:text-base"
                  >
                    <i className="fas fa-arrow-down mr-2"></i>
                    Traversal Preorder
                  </button>
                  <button
                    onClick={() => performTraversal('postorder')}
                    className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-xl hover:from-violet-500 hover:to-violet-600 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-opacity-50 font-medium shadow-lg flex items-center justify-center text-sm sm:text-base"
                  >
                    <i className="fas fa-arrow-up mr-2"></i>
                    Traversal Postorder
                  </button>
                </div>
              </div>

              {/* Result Card */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xl border border-gray-200 hover:shadow-2xl transition-all duration-300">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <i className="fas fa-list-ol mr-2 text-indigo-600"></i>
                  Hasil Traversal
                </h2>
                <p className="text-base sm:text-lg font-medium text-gray-700 break-words">
                  {traversalResult}
                </p>
              </div>
            </div>

            {/* Right Panel - Visualization */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xl border border-gray-200 h-full hover:shadow-2xl transition-all duration-300">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <i className="fas fa-project-diagram mr-2 text-indigo-600"></i>
                    Visualisasi Tree
                  </div>
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                  >
                    <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'} text-indigo-600`}></i>
                  </button>
                </h2>
                <div
                  ref={visualizationRef}
                  className="visualization rounded-xl border border-gray-200 min-h-[400px] sm:min-h-[500px] md:min-h-[600px] bg-gray-50 overflow-hidden cursor-grab active:cursor-grabbing"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <div
                    className="transform-container"
                    style={{
                      transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                      transformOrigin: 'center',
                      transition: isDraggingRef.current ? 'none' : 'transform 0.3s ease'
                    }}
                  >
                    {tree.root && (
                      <>
                        {renderEdges(tree.root)}
                        {renderNodes(tree.root)}
                      </>
                    )}
                  </div>
                  <div className="zoom-controls">
                    <button 
                      className="zoom-btn" 
                      onClick={handleZoomIn}
                      title="Zoom in"
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                    <button 
                      className="zoom-btn" 
                      onClick={handleZoomOut}
                      title="Zoom out"
                    >
                      <i className="fas fa-minus"></i>
                    </button>
                    <button 
                      className="zoom-btn" 
                      onClick={handleZoomReset}
                      title="Reset view"
                    >
                      <i className="fas fa-compress-alt"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Information Section */}
          <div className="mt-4 sm:mt-8 bg-white rounded-2xl p-4 sm:p-6 shadow-xl border border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 sm:mb-6 flex items-center">
              <i className="fas fa-info-circle mr-2 text-indigo-600"></i>
              Penjelasan Traversal
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="text-base sm:text-lg font-medium text-indigo-600 mb-2">
                  Inorder (Kiri → Akar → Kanan)
                </h3>
                <p className="text-sm sm:text-base text-gray-700">
                  Algoritma mengunjungi subtree kiri, kemudian node akar, dan terakhir subtree kanan.
                </p>
              </div>
              <div className="p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="text-base sm:text-lg font-medium text-blue-600 mb-2">
                  Preorder (Akar → Kiri → Kanan)
                </h3>
                <p className="text-sm sm:text-base text-gray-700">
                  Algoritma mengunjungi node akar terlebih dahulu, lalu subtree kiri, dan terakhir subtree kanan.
                </p>
              </div>
              <div className="p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="text-base sm:text-lg font-medium text-violet-600 mb-2">
                  Postorder (Kiri → Kanan → Akar)
                </h3>
                <p className="text-sm sm:text-base text-gray-700">
                  Algoritma mengunjungi subtree kiri, kemudian subtree kanan, dan terakhir node akar.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div
          ref={fullscreenModalRef}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <div className="bg-white/90 w-11/12 h-5/6 rounded-2xl p-4 sm:p-6 relative backdrop-blur-md">
            <div className="absolute -top-12 right-0 sm:top-0 sm:-right-12">
              <button
                onClick={toggleFullscreen}
                className="fullscreen-close-btn"
                title="Close fullscreen"
              >
                <i className="fas fa-times text-xl sm:text-2xl"></i>
              </button>
            </div>
            <div className="w-full h-full">
              <div 
                className="w-full h-full visualization rounded-xl border border-gray-200 bg-gray-50/80 overflow-hidden cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <div
                  className="transform-container"
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transformOrigin: 'center',
                    transition: isDraggingRef.current ? 'none' : 'transform 0.3s ease'
                  }}
                >
                  {tree.root && (
                    <>
                      {renderEdges(tree.root)}
                      {renderNodes(tree.root)}
                    </>
                  )}
                </div>
                <div className="zoom-controls">
                  <button 
                    className="zoom-btn" 
                    onClick={handleZoomIn}
                    title="Zoom in"
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                  <button 
                    className="zoom-btn" 
                    onClick={handleZoomOut}
                    title="Zoom out"
                  >
                    <i className="fas fa-minus"></i>
                  </button>
                  <button 
                    className="zoom-btn" 
                    onClick={handleZoomReset}
                    title="Reset view"
                  >
                    <i className="fas fa-compress-alt"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
