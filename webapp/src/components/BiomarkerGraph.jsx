import React, { useEffect, useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import { RotateCw, Layers, Compass, Info, Sun, Moon, Play, Pause, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

// ─── Lobe Colors (High-contrast medical palette) ──────────────────────────────
const LOBE_COLORS = {
  Frontal:     '#3b82f6', // Electric Blue
  Parietal:    '#a855f7', // Vivid Purple
  Temporal:    '#f59e0b', // Glowing Amber
  Occipital:   '#10b981', // Emerald
  Cerebellum:  '#ef4444', // Crimson Red
  Subcortical: '#06b6d4', // Cyan
}

const TRACT_COLORS = {
  DMN:            '#38bdf8', // Cyan
  SocialBrain:    '#fb923c', // Amber
  CerebellarLoop: '#f43f5e', // Rose
  All:            '#818cf8', // Indigo
}

// Convert MNI coordinates [x, y, z] to Three.js coordinates
// In MNI: +X = Right, +Y = Anterior, +Z = Superior
// In Three.js: +X = Right, +Y = Superior (up), +Z = Anterior (towards camera)
function mniToThree(mni, scale = 0.08) {
  const [x, y, z] = mni
  return new THREE.Vector3(x * scale, z * scale, y * scale)
}

// ─── Procedural Anatomical Glass Brain Geometry Generator ────────────────────
// Generates dual-hemisphere cortex surface with gyral/sulcal anatomical contours
function createGlassBrainGeometry() {
  const geom = new THREE.BufferGeometry()
  const uSegments = 42
  const vSegments = 42

  const positions = []
  const normals = []
  const uvs = []
  const indices = []

  // Generate anatomical dual-hemisphere mesh
  for (let hemi = -1; hemi <= 1; hemi += 2) { // -1 for Left, +1 for Right
    const baseIndex = positions.length / 3

    for (let i = 0; i <= uSegments; i++) {
      const u = i / uSegments
      const theta = u * Math.PI // 0 to PI (Superior to Inferior)

      for (let j = 0; j <= vSegments; j++) {
        const v = j / vSegments
        const phi = v * Math.PI // 0 to PI (Anterior to Posterior)

        // Base anatomical ellipsoid parameters for human brain
        let rx = 3.6
        let ry = 4.2
        let rz = 5.2

        // Frontal pole tapering
        if (phi < Math.PI * 0.3) {
          rx *= 0.88 + 0.12 * Math.sin(phi / 0.3 * Math.PI * 0.5)
        }
        // Occipital lobe tapering
        if (phi > Math.PI * 0.7) {
          rx *= 0.82
          ry *= 0.88
        }
        // Temporal lobe lateral bulge
        if (phi > Math.PI * 0.35 && phi < Math.PI * 0.65 && theta > Math.PI * 0.5) {
          rx *= 1.15
        }
        // Cerebellar postero-inferior bulge
        let cerebellumOffset = 0
        if (phi > Math.PI * 0.72 && theta > Math.PI * 0.65) {
          cerebellumOffset = -0.5
          rx *= 0.95
        }

        // Gyral/Sulcal surface undulations (anatomical wrinkles)
        const gyri = 0.08 * Math.sin(theta * 14) * Math.cos(phi * 12) +
                     0.04 * Math.sin(theta * 28 + phi * 20)

        // Parametric coordinates
        const x = hemi * (0.28 + (rx + gyri) * Math.sin(theta) * Math.sin(phi))
        const y = (ry + gyri + cerebellumOffset) * Math.cos(theta)
        const z = (rz + gyri) * Math.cos(phi)

        positions.push(x, y, z)
        uvs.push(u, v)

        // Approximate normal vector
        const norm = new THREE.Vector3(x - hemi * 0.28, y, z).normalize()
        normals.push(norm.x, norm.y, norm.z)
      }
    }

    // Connect grid quads into triangular faces
    for (let i = 0; i < uSegments; i++) {
      for (let j = 0; j < vSegments; j++) {
        const a = baseIndex + i * (vSegments + 1) + j
        const b = baseIndex + (i + 1) * (vSegments + 1) + j
        const c = baseIndex + (i + 1) * (vSegments + 1) + (j + 1)
        const d = baseIndex + i * (vSegments + 1) + (j + 1)

        indices.push(a, b, d)
        indices.push(b, c, d)
      }
    }
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geom.setIndex(indices)
  geom.computeVertexNormals()

  return geom
}

export default function BiomarkerGraph({ nodes = [], edges = [] }) {
  const mountRef = useRef(null)

  // Interactive controls state
  const [viewMode, setViewMode] = useState('3d') // '3d' | 'triplanar'
  const [theme, setTheme] = useState('dark') // 'dark' | 'light'
  const [circuitFilter, setCircuitFilter] = useState('All')
  const [selectedNode, setSelectedNode] = useState(null)
  const [autoRotate, setAutoRotate] = useState(true)
  const [glassOpacity, setGlassOpacity] = useState(0.28)
  const [showWireframe, setShowWireframe] = useState(true)

  // Filter edges based on selected circuit
  const filteredEdges = useMemo(() => {
    if (!edges) return []
    if (circuitFilter === 'All') return edges
    if (circuitFilter === 'DMN') return edges.filter(e => e.circuit === 'DMN')
    if (circuitFilter === 'SocialBrain') return edges.filter(e => e.circuit === 'SocialBrain')
    if (circuitFilter === 'Underconnected') return edges.filter(e => e.type === 'long-range')
    if (circuitFilter === 'InterHemispheric') return edges.filter(e => e.type === 'inter-hemispheric')
    return edges
  }, [edges, circuitFilter])

  const activeNodeIds = useMemo(() => {
    if (circuitFilter === 'All') return new Set(nodes.map(n => n.id))
    const ids = new Set()
    filteredEdges.forEach(e => {
      const sId = typeof e.source === 'object' ? e.source.id : e.source
      const tId = typeof e.target === 'object' ? e.target.id : e.target
      ids.add(sId)
      ids.add(tId)
    })
    return ids
  }, [nodes, filteredEdges, circuitFilter])

  // ─── THREE.JS 3D GLASS BRAIN INITIALIZATION ────────────────────────────────
  useEffect(() => {
    if (!mountRef.current || viewMode !== '3d') return
    const container = mountRef.current
    const width = container.clientWidth || 680
    const height = container.clientHeight || 460

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(13, 8, 14)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    // Set Scene Background
    const isDark = theme === 'dark'
    scene.background = new THREE.Color(isDark ? 0x090d16 : 0xf8fafc)

    // 2. Lighting setup (Medical Holographic Rim Lighting)
    const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 0.6 : 0.9)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0x38bdf8, isDark ? 1.8 : 1.2)
    keyLight.position.set(10, 15, 10)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0xa855f7, isDark ? 1.4 : 0.8)
    fillLight.position.set(-10, -8, -10)
    scene.add(fillLight)

    const rimLight = new THREE.PointLight(0x38bdf8, isDark ? 3.0 : 1.5, 50)
    rimLight.position.set(0, 12, -15)
    scene.add(rimLight)

    // 3. Brain Root Pivot Group
    const brainGroup = new THREE.Group()
    scene.add(brainGroup)

    // 4. Procedural Glass Brain Mesh
    const brainGeometry = createGlassBrainGeometry()

    // Glass Material with real transmissive depth & specular sheen
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: isDark ? 0x38bdf8 : 0x94a3b8,
      metalness: 0.05,
      roughness: 0.15,
      transmission: 0.92,
      thickness: 1.2,
      transparent: true,
      opacity: glassOpacity,
      reflectivity: 0.8,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    })

    const glassMesh = new THREE.Mesh(brainGeometry, glassMaterial)
    brainGroup.add(glassMesh)

    // Optional Holographic Wireframe Overlay
    let wireMesh = null
    if (showWireframe) {
      const wireGeometry = new THREE.WireframeGeometry(brainGeometry)
      const wireMaterial = new THREE.LineBasicMaterial({
        color: isDark ? 0x38bdf8 : 0x64748b,
        transparent: true,
        opacity: isDark ? 0.18 : 0.14,
        linewidth: 1,
      })
      wireMesh = new THREE.LineSegments(wireGeometry, wireMaterial)
      brainGroup.add(wireMesh)
    }

    // 5. Connectome Nodes (Luminous 3D Spheres with Outer Glow)
    const nodeMeshes = []
    const nodeObjectsMap = new Map()

    nodes.forEach(node => {
      const pos = mniToThree(node.mni)
      const isActive = activeNodeIds.has(node.id)
      const isSelected = selectedNode?.id === node.id
      const lobeColor = LOBE_COLORS[node.lobe] || '#38bdf8'
      const hexColor = new THREE.Color(isActive ? lobeColor : '#475569')

      // Inner Core Sphere
      const sphereRadius = 0.22 + node.salience * 0.18
      const sphereGeom = new THREE.SphereGeometry(sphereRadius, 24, 24)
      const sphereMat = new THREE.MeshStandardMaterial({
        color: hexColor,
        emissive: hexColor,
        emissiveIntensity: isActive ? (isDark ? 0.85 : 0.4) : 0.1,
        roughness: 0.2,
        metalness: 0.2,
      })
      const sphereMesh = new THREE.Mesh(sphereGeom, sphereMat)
      sphereMesh.position.copy(pos)
      sphereMesh.userData = { node }
      brainGroup.add(sphereMesh)
      nodeMeshes.push(sphereMesh)
      nodeObjectsMap.set(node.id, sphereMesh)

      // Outer Glow Halo Sprite
      if (isActive && isDark) {
        const haloGeom = new THREE.SphereGeometry(sphereRadius * 1.6, 16, 16)
        const haloMat = new THREE.MeshBasicMaterial({
          color: hexColor,
          transparent: true,
          opacity: 0.25,
          side: THREE.BackSide,
        })
        const haloMesh = new THREE.Mesh(haloGeom, haloMat)
        haloMesh.position.copy(pos)
        brainGroup.add(haloMesh)
      }

      // Selection Ring
      if (isSelected) {
        const ringGeom = new THREE.RingGeometry(sphereRadius * 1.5, sphereRadius * 1.8, 32)
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xf59e0b,
          side: THREE.DoubleSide,
        })
        const ringMesh = new THREE.Mesh(ringGeom, ringMat)
        ringMesh.position.copy(pos)
        ringMesh.lookAt(camera.position)
        brainGroup.add(ringMesh)
      }
    })

    // 6. Connectome 3D Volumetric Neural Fiber Tracts (Tubes)
    const tractMeshes = []
    const pulseParticles = []

    filteredEdges.forEach(edge => {
      const sId = typeof edge.source === 'object' ? edge.source.id : edge.source
      const tId = typeof edge.target === 'object' ? edge.target.id : edge.target
      const sNode = nodes.find(n => n.id === sId)
      const tNode = nodes.find(n => n.id === tId)
      if (!sNode || !tNode) return

      const p1 = mniToThree(sNode.mni)
      const p2 = mniToThree(tNode.mni)
      const isActive = activeNodeIds.has(sId) && activeNodeIds.has(tId)

      // Quadratic Curve through Brain Matter (bowing outwards)
      const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)
      const centerVec = midPoint.clone().normalize()
      midPoint.addScaledVector(centerVec, 0.45) // Curve outward

      const curve = new THREE.QuadraticBezierCurve3(p1, midPoint, p2)
      const tubeRadius = (0.04 + edge.weight * 0.05)
      const tubeGeom = new THREE.TubeGeometry(curve, 32, tubeRadius, 8, false)

      const tractColor = new THREE.Color(TRACT_COLORS[edge.circuit] || TRACT_COLORS.All)
      const tubeMat = new THREE.MeshStandardMaterial({
        color: tractColor,
        emissive: tractColor,
        emissiveIntensity: isActive ? (isDark ? 0.9 : 0.4) : 0.08,
        transparent: true,
        opacity: isActive ? 0.85 : 0.15,
        roughness: 0.3,
      })

      const tubeMesh = new THREE.Mesh(tubeGeom, tubeMat)
      brainGroup.add(tubeMesh)
      tractMeshes.push(tubeMesh)

      // Pulse Particle animating along the curve
      if (isActive && isDark && edge.type === 'long-range') {
        const partGeom = new THREE.SphereGeometry(tubeRadius * 1.5, 8, 8)
        const partMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
        const partMesh = new THREE.Mesh(partGeom, partMat)
        brainGroup.add(partMesh)
        pulseParticles.push({ mesh: partMesh, curve, progress: Math.random() })
      }
    })

    // 7. Interactive Orbit & Mouse Drag Controls
    let isMouseDown = false
    let prevMouse = { x: 0, y: 0 }

    const onMouseDown = (e) => {
      isMouseDown = true
      prevMouse = { x: e.clientX, y: e.clientY }
    }

    const onMouseMove = (e) => {
      if (!isMouseDown) return
      const deltaX = e.clientX - prevMouse.x
      const deltaY = e.clientY - prevMouse.y

      brainGroup.rotation.y += deltaX * 0.008
      brainGroup.rotation.x += deltaY * 0.008
      brainGroup.rotation.x = Math.max(-1.3, Math.min(1.3, brainGroup.rotation.x))

      prevMouse = { x: e.clientX, y: e.clientY }
    }

    const onMouseUp = () => {
      isMouseDown = false
    }

    const onWheel = (e) => {
      e.preventDefault()
      camera.position.z += e.deltaY * 0.02
      camera.position.z = Math.max(6, Math.min(28, camera.position.z))
    }

    // 8. Raycasting for Clicking Nodes
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const onClick = (e) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(nodeMeshes)

      if (intersects.length > 0) {
        const hitNode = intersects[0].object.userData.node
        setSelectedNode(hitNode)
      }
    }

    container.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    container.addEventListener('wheel', onWheel, { passive: false })
    container.addEventListener('click', onClick)

    // 9. Animation Loop
    let animId = null
    const clock = new THREE.Clock()

    const animate = () => {
      animId = requestAnimationFrame(animate)
      const delta = clock.getDelta()

      // Auto-spin if enabled and user is not dragging
      if (autoRotate && !isMouseDown) {
        brainGroup.rotation.y += 0.006
      }

      // Animate pulsing fiber particles
      pulseParticles.forEach(p => {
        p.progress = (p.progress + delta * 0.45) % 1
        const pt = p.curve.getPoint(p.progress)
        p.mesh.position.copy(pt)
      })

      renderer.render(scene, camera)
    }

    animate()

    // 10. Clean up on unmount or re-render
    return () => {
      cancelAnimationFrame(animId)
      container.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      container.removeEventListener('wheel', onWheel)
      container.removeEventListener('click', onClick)
      renderer.dispose()
      brainGeometry.dispose()
      glassMaterial.dispose()
      container.innerHTML = ''
    }
  }, [viewMode, theme, nodes, filteredEdges, circuitFilter, selectedNode, autoRotate, glassOpacity, showWireframe, activeNodeIds])

  return (
    <div className={`relative w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col border ${theme === 'dark' ? 'bg-[#090d16] border-slate-800' : 'bg-white border-slate-200'}`}>
      
      {/* ─── Control Header ────────────────────────────────────────── */}
      <div className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${theme === 'dark' ? 'bg-[#0c1220] border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
        
        {/* View Mode Buttons */}
        <div className={`flex items-center gap-1 p-1 rounded-xl border text-xs font-semibold ${theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'}`}>
          <button
            onClick={() => setViewMode('3d')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${viewMode === '3d' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <RotateCw className="w-3.5 h-3.5" /> 3D WebGL Glass Brain
          </button>
          <button
            onClick={() => setViewMode('triplanar')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${viewMode === 'triplanar' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Layers className="w-3.5 h-3.5" /> Orthogonal Tri-Planar
          </button>
        </div>

        {/* Right Tools: Circuit Filter + Opacity + Auto-spin + Theme */}
        <div className="flex items-center gap-2">
          {/* Circuit Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium">Circuit:</span>
            <select
              value={circuitFilter}
              onChange={(e) => setCircuitFilter(e.target.value)}
              className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 border focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'}`}
            >
              <option value="All">All Biomarkers (14 Tracts)</option>
              <option value="DMN">Default Mode Network (mPFC ↔ Precun/PCC)</option>
              <option value="SocialBrain">Social Brain Circuit (STS ↔ IFG/Amyg)</option>
              <option value="Underconnected">Long-Range Underconnected (82.4%)</option>
              <option value="InterHemispheric">Inter-Hemispheric Bridges</option>
            </select>
          </div>

          {/* Wireframe Toggle */}
          {viewMode === '3d' && (
            <button
              onClick={() => setShowWireframe(!showWireframe)}
              title="Toggle anatomical wireframe grid"
              className={`px-2 py-1.5 rounded-lg border text-xs font-semibold ${showWireframe ? 'bg-blue-600 text-white border-blue-500' : theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'}`}
            >
              Grid
            </button>
          )}

          {/* Auto-rotate Toggle */}
          {viewMode === '3d' && (
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              title={autoRotate ? "Pause 3D rotation" : "Auto-rotate 3D brain"}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 font-semibold ${autoRotate ? 'bg-blue-600 text-white border-blue-500' : theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'}`}
            >
              {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{autoRotate ? 'Spin' : 'Paused'}</span>
            </button>
          )}

          {/* Theme Switcher */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle Dark Neuro-Glow / Clinical White theme"
            className={`p-1.5 rounded-lg border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ─── 3D WebGL Canvas Container ─────────────────────────────── */}
      <div className="relative w-full h-[470px] select-none flex items-center justify-center">
        {viewMode === '3d' ? (
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
        ) : (
          /* Nilearn Tri-Planar Fallback Layout */
          <div className="w-full h-full p-4 flex flex-col justify-center items-center">
            <div className="grid grid-cols-3 gap-4 w-full max-w-4xl text-center">
              {['Sagittal (Lateral)', 'Coronal (Frontal)', 'Axial (Horizontal)'].map((plane, i) => (
                <div key={plane} className={`p-4 rounded-xl border flex flex-col items-center justify-center h-80 ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <h4 className="font-bold text-xs text-blue-400 mb-2">{plane}</h4>
                  <div className="w-32 h-32 rounded-full border border-dashed border-slate-500/50 flex items-center justify-center text-xs text-slate-400">
                    Orthogonal {plane.split(' ')[0]}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-3 font-mono">MNI-152 Slice Projection</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Anatomical Lobe Legend Overlay */}
        <div className={`absolute top-4 left-4 rounded-xl p-3 border shadow-xl text-xs space-y-1.5 backdrop-blur-md pointer-events-none ${theme === 'dark' ? 'bg-slate-900/85 border-slate-800 text-slate-300' : 'bg-white/90 border-slate-200 text-slate-700'}`}>
          <div className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider mb-1">AAL Anatomical Lobes</div>
          {Object.entries(LOBE_COLORS).map(([lobe, color]) => (
            <div key={lobe} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ background: color }} />
              <span className="text-[11px] font-medium">{lobe}</span>
            </div>
          ))}
        </div>

        {/* Functional Tract Legend Overlay */}
        <div className={`absolute bottom-4 left-4 rounded-xl p-3 border shadow-xl text-xs space-y-1 backdrop-blur-md pointer-events-none ${theme === 'dark' ? 'bg-slate-900/85 border-slate-800 text-slate-300' : 'bg-white/90 border-slate-200 text-slate-700'}`}>
          <div className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider mb-1">Tract Classification</div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1 rounded-full bg-[#38bdf8]" />
            <span className="text-[11px]">Default Mode Network (DMN)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1 rounded-full bg-[#fb923c]" />
            <span className="text-[11px]">Social Brain (STS/IFG)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1 rounded-full bg-[#818cf8]" />
            <span className="text-[11px]">Inter-Hemispheric Bridge</span>
          </div>
        </div>

        {/* 3D Interaction Instructions Hint */}
        {viewMode === '3d' && (
          <div className={`absolute top-4 right-4 rounded-lg px-3 py-1.5 text-[11px] font-mono border backdrop-blur-sm shadow-md pointer-events-none ${theme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
            <span>Drag: Orbit 3D</span> | <span>Scroll: Zoom</span> | <span>Click: Inspect ROI</span>
          </div>
        )}
      </div>

      {/* ─── Bottom Anatomical Inspector Drawer ────────────────────────────── */}
      <div className={`p-4 border-t transition-colors ${theme === 'dark' ? 'bg-[#0c1220] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}>
        {selectedNode ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base text-blue-400">{selectedNode.fullName}</span>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    AAL-116 #{selectedNode.aalIndex}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded text-white shadow-sm" style={{ background: LOBE_COLORS[selectedNode.lobe] }}>
                    {selectedNode.lobe} Lobe
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{selectedNode.desc}</p>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                Clear Selection
              </button>
            </div>

            <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl p-3 border text-xs ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">MNI-152 Stereotaxic Space</span>
                <span className="font-mono font-bold text-blue-400">[{selectedNode.mni?.join(', ')}] mm</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">GNNExplainer Salience</span>
                <span className="font-mono font-bold text-amber-400">{(selectedNode.salience * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Implicated Circuit</span>
                <span className="font-bold text-slate-200">{selectedNode.circuit}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Hemispheric Orientation</span>
                <span className="font-bold text-slate-200">{selectedNode.hemi === 'L' ? 'Left Hemisphere' : selectedNode.hemi === 'R' ? 'Right Hemisphere' : 'Medial Midline'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>3D WebGL Glass Brain: Click and drag to orbit in true 3D space. Hover or click any glowing region to inspect stereotaxic coordinates and clinical circuits.</span>
            </div>
            <span className="font-mono font-semibold text-slate-500">15 Salient Regions Active</span>
          </div>
        )}
      </div>
    </div>
  )
}
