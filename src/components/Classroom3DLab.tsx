import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Box, Eye, Layers, Maximize2, RotateCcw,
  Sparkles, Sun, UserCheck, X, ZoomIn, ZoomOut, Play, Pause, RefreshCw, Volume2, Globe, Atom, Dna,
  CheckCircle, AlertCircle, Clock, Info, Check
} from 'lucide-react';
import { ClassGroup, Student } from '../types';

interface Classroom3DLabProps {
  activeClass: ClassGroup;
  onSelectStudent?: (student: Student) => void;
  onClose?: () => void;
}

type SceneMode = 'classroom' | 'solar' | 'dna' | 'atom' | 'geometry';

// ==========================================
// Procedural Texture Generators
// ==========================================
function createWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#8B5A2B';
  ctx.fillRect(0, 0, 512, 512);

  // Wood grain lines
  ctx.fillStyle = 'rgba(70, 35, 10, 0.15)';
  for (let i = 0; i < 400; i++) {
    const y = Math.random() * 512;
    const h = Math.random() * 3 + 1;
    ctx.fillRect(0, y, 512, h);
  }

  // Rings
  ctx.strokeStyle = 'rgba(60, 25, 5, 0.08)';
  ctx.lineWidth = 4;
  for (let r = 20; r < 600; r += 25) {
    ctx.beginPath();
    ctx.arc(256 + Math.sin(r) * 30, 256 + Math.cos(r) * 30, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createChalkboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark green chalkboard background
  ctx.fillStyle = '#1e382b';
  ctx.fillRect(0, 0, 1024, 512);

  // Chalk smudges
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let i = 0; i < 1500; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 512;
    const r = Math.random() * 20 + 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Arabic Chalk Writings
  ctx.fillStyle = 'rgba(240, 245, 240, 0.85)';
  ctx.font = 'bold 36px Tahoma, sans-serif';
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillText('بسم الله الرحمن الرحيم', 980, 70);

  ctx.font = '24px Tahoma, sans-serif';
  ctx.fillText('درس اليوم: العلوم الفيزيائية والطبيعية 3D', 980, 130);

  ctx.font = '20px monospace';
  ctx.fillText('E = m · c²  |  H₂O  |  DNA Structure', 980, 180);

  // Grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 1024; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y < 512; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createTileTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, 512, 512);

  // Tiles grid
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, 512, 512);
  ctx.strokeRect(0, 0, 256, 256);
  ctx.strokeRect(256, 0, 256, 256);
  ctx.strokeRect(0, 256, 256, 256);
  ctx.strokeRect(256, 256, 256, 256);

  // Subtle marble noise
  ctx.fillStyle = 'rgba(148, 163, 184, 0.1)';
  for (let i = 0; i < 300; i++) {
    ctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 40, Math.random() * 4);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  return texture;
}

function createStudentNameTagSprite(name: string, isAbsent: boolean, isLate: boolean): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = isAbsent ? 'rgba(225, 29, 72, 0.9)' : isLate ? 'rgba(217, 119, 6, 0.9)' : 'rgba(15, 23, 42, 0.85)';
  ctx.roundRect(10, 10, 236, 108, 16);
  ctx.fill();

  ctx.strokeStyle = isAbsent ? '#fecdd3' : isLate ? '#fef08a' : '#38bdf8';
  ctx.lineWidth = 4;
  ctx.roundRect(10, 10, 236, 108, 16);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  
  const displayName = name.length > 14 ? name.substring(0, 12) + '...' : name;
  ctx.fillText(displayName, 128, 50);

  ctx.font = '16px Tahoma, sans-serif';
  ctx.fillStyle = isAbsent ? '#ffe4e6' : isLate ? '#fef9c3' : '#e0f2fe';
  ctx.fillText(isAbsent ? 'غائب ❌' : isLate ? 'متأخر ⏳' : 'حاضر ✓', 128, 88);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(1.4, 0.7, 1);
  return sprite;
}

export const Classroom3DLab: React.FC<Classroom3DLabProps> = ({
  activeClass,
  onSelectStudent,
  onClose
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sceneMode, setSceneMode] = useState<SceneMode>('classroom');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [hoveredStudent, setHoveredStudent] = useState<Student | null>(null);
  const [isControlsExpanded, setIsControlsExpanded] = useState<boolean>(true);
  const [selectedDeskIndex, setSelectedDeskIndex] = useState<number | null>(null);

  // Classroom Visibility Control Panel Toggles
  const [showDesks, setShowDesks] = useState<boolean>(true);
  const [showBoard, setShowBoard] = useState<boolean>(true);
  const [showWalls, setShowWalls] = useState<boolean>(true);
  const [showLabEquipment, setShowLabEquipment] = useState<boolean>(true);

  // Model parameters
  const [dnaUnwind, setDnaUnwind] = useState<number>(0);
  const [atomElement, setAtomElement] = useState<'carbon' | 'oxygen' | 'gold'>('carbon');
  const [polyhedronType, setPolyhedronType] = useState<'cube' | 'tetra' | 'octa' | 'cylinder'>('cube');
  const [wireframeMode, setWireframeMode] = useState<boolean>(false);

  // Refs for animation loop
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameId = useRef<number | null>(null);

  // Dynamic mesh references for animation
  const earthRef = useRef<THREE.Mesh | null>(null);
  const moonPivotRef = useRef<THREE.Group | null>(null);
  const dnaGroupRef = useRef<THREE.Group | null>(null);
  const atomGroupRef = useRef<THREE.Group | null>(null);
  const electronsRef = useRef<THREE.Mesh[]>([]);
  const polyMeshRef = useRef<THREE.Mesh | null>(null);

  // Reusable vectors for GC prevention
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Initialize Scene, Camera, Renderer
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a');
    scene.fog = new THREE.FogExp2('#0f172a', 0.025);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 5, 10);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    containerRef.current.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 2;
    controls.maxDistance = 30;
    controlsRef.current = controls;

    // Studio Environment (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Lighting Setup
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.6);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight('#38bdf8', '#1e293b', 0.6);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#fff7ed', 1.4);
    keyLight.position.set(6, 12, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    buildModeScene(sceneMode);

    // Animation Loop
    const clock = new THREE.Clock();
    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      if (isPlaying) {
        const speed = speedMultiplier;
        if (earthRef.current) earthRef.current.rotation.y += delta * 0.4 * speed;
        if (moonPivotRef.current) moonPivotRef.current.rotation.y += delta * 0.8 * speed;
        if (dnaGroupRef.current) dnaGroupRef.current.rotation.y += delta * 0.5 * speed;
        if (atomGroupRef.current) atomGroupRef.current.rotation.y += delta * 0.3 * speed;
        electronsRef.current.forEach((el, idx) => {
          el.rotation.z += delta * (2 + idx * 0.5) * speed;
        });
        if (polyMeshRef.current) {
          polyMeshRef.current.rotation.x += delta * 0.3 * speed;
          polyMeshRef.current.rotation.y += delta * 0.5 * speed;
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.domElement.remove();
      }
    };
  }, []);

  // Rebuild scene when sceneMode, activeClass, or visibility toggles change
  useEffect(() => {
    if (sceneRef.current) {
      buildModeScene(sceneMode);
    }
  }, [sceneMode, activeClass, polyhedronType, wireframeMode, atomElement, dnaUnwind, showDesks, showBoard, showWalls, showLabEquipment]);

  // Handle Raycasting for student hover / selection in Classroom mode
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (sceneMode !== 'classroom' || !containerRef.current || !cameraRef.current || !sceneRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(mouse.current, cameraRef.current);
    const intersects = raycaster.current.intersectObjects(sceneRef.current.children, true);

    let foundStudent: Student | null = null;
    let foundSeatIdx: number | null = null;

    for (const hit of intersects) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (obj.userData && typeof obj.userData.seatIndex === 'number') {
          foundSeatIdx = obj.userData.seatIndex;
          if (obj.userData.student) {
            foundStudent = obj.userData.student;
          }
          break;
        }
        obj = obj.parent;
      }
      if (foundSeatIdx !== null) break;
    }

    setHoveredStudent(foundStudent);
    setSelectedDeskIndex(foundSeatIdx);
  };

  const handleClick = () => {
    if (hoveredStudent && onSelectStudent) {
      onSelectStudent(hoveredStudent);
    }
  };

  // ==========================================
  // Scene Construction Functions
  // ==========================================
  const buildModeScene = (mode: SceneMode) => {
    const scene = sceneRef.current;
    if (!scene) return;

    const objectsToRemove = scene.children.filter(
      child => !(child instanceof THREE.Light)
    );
    objectsToRemove.forEach(obj => scene.remove(obj));

    if (cameraRef.current && controlsRef.current) {
      if (mode === 'classroom') {
        cameraRef.current.position.set(0, 6, 12);
        controlsRef.current.target.set(0, 1, 0);
      } else {
        cameraRef.current.position.set(0, 3, 6);
        controlsRef.current.target.set(0, 0, 0);
      }
      controlsRef.current.update();
    }

    if (mode === 'classroom') {
      buildClassroomScene(scene);
    } else if (mode === 'solar') {
      buildSolarSystemScene(scene);
    } else if (mode === 'dna') {
      buildDnaScene(scene);
    } else if (mode === 'atom') {
      buildAtomScene(scene);
    } else if (mode === 'geometry') {
      buildGeometryScene(scene);
    }
  };

  // 1. Build 3D Classroom Scene with Visibility Toggles
  const buildClassroomScene = (scene: THREE.Scene) => {
    const woodTex = createWoodTexture();
    const boardTex = createChalkboardTexture();
    const tileTex = createTileTexture();

    // Walls & Floor
    if (showWalls) {
      const floorGeo = new THREE.PlaneGeometry(16, 14);
      const floorMat = new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.2, metalness: 0.1 });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      const wallMat = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.8 });
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 0.3), wallMat);
      backWall.position.set(0, 3, -7);
      backWall.receiveShadow = true;
      scene.add(backWall);
    }

    // Blackboard & Projector Area
    if (showBoard) {
      const boardGroup = new THREE.Group();
      const frameGeo = new THREE.BoxGeometry(8.4, 3.4, 0.1);
      const frameMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.4 });
      const frameMesh = new THREE.Mesh(frameGeo, frameMat);
      boardGroup.add(frameMesh);

      const boardCanvasGeo = new THREE.PlaneGeometry(8, 3);
      const boardCanvasMat = new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.6 });
      const boardCanvasMesh = new THREE.Mesh(boardCanvasGeo, boardCanvasMat);
      boardCanvasMesh.position.z = 0.06;
      boardGroup.add(boardCanvasMesh);

      boardGroup.position.set(0, 3.2, -6.8);
      scene.add(boardGroup);

      // Teacher Desk Group
      const teacherDeskGroup = new THREE.Group();
      const deskTopGeo = new THREE.BoxGeometry(3, 0.12, 1.4);
      const deskTopMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.3 });
      const deskTop = new THREE.Mesh(deskTopGeo, deskTopMat);
      deskTop.position.y = 1.2;
      deskTop.castShadow = true;
      deskTop.receiveShadow = true;
      teacherDeskGroup.add(deskTop);

      const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 16);
      const legMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.8, roughness: 0.2 });
      [[-1.3, -0.5], [1.3, -0.5], [-1.3, 0.5], [1.3, 0.5]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(x, 0.6, z);
        leg.castShadow = true;
        teacherDeskGroup.add(leg);
      });

      teacherDeskGroup.position.set(0, 0, -4.5);
      scene.add(teacherDeskGroup);
    }

    // Student Desks Grid Setup
    if (showDesks) {
      const rows = 3;
      const cols = 4;
      const startX = -4.2;
      const startZ = -2.0;
      const stepX = 2.8;
      const stepZ = 2.2;
      const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 16);
      const legMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.8, roughness: 0.2 });

      let seatCounter = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const seatIdx = seatCounter++;
          const student = activeClass.students.find(s => s.seatIndex === seatIdx);

          const deskGroup = new THREE.Group();
          deskGroup.userData = { seatIndex: seatIdx, student };

          const stDeskTop = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 0.08, 0.9),
            new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.4 })
          );
          stDeskTop.position.y = 0.95;
          stDeskTop.castShadow = true;
          stDeskTop.receiveShadow = true;
          deskGroup.add(stDeskTop);

          [[-0.8, -0.35], [0.8, -0.35], [-0.8, 0.35], [0.8, 0.35]].forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(lx, 0.475, lz);
            leg.scale.set(1, 0.8, 1);
            leg.castShadow = true;
            deskGroup.add(leg);
          });

          const chairSeat = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.06, 0.7),
            new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.5 })
          );
          chairSeat.position.set(0, 0.55, 0.6);
          chairSeat.castShadow = true;
          deskGroup.add(chairSeat);

          const chairBack = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.5, 0.05),
            new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.5 })
          );
          chairBack.position.set(0, 0.8, 0.92);
          chairBack.castShadow = true;
          deskGroup.add(chairBack);

          const notebook = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.03, 0.3),
            new THREE.MeshStandardMaterial({
              color: student ? (student.attendance === 'absent' ? '#f43f5e' : '#10b981') : '#cbd5e1'
            })
          );
          notebook.position.set(0.3, 1.0, 0.1);
          deskGroup.add(notebook);

          if (student) {
            const nameSprite = createStudentNameTagSprite(
              `${student.lastName} ${student.firstName}`,
              student.attendance === 'absent',
              student.attendance === 'late'
            );
            nameSprite.position.set(0, 1.8, 0);
            deskGroup.add(nameSprite);
          }

          deskGroup.position.set(startX + c * stepX, 0, startZ + r * stepZ);
          scene.add(deskGroup);
        }
      }
    }

    // Lab Equipment & Science Props
    if (showLabEquipment) {
      const labTableGroup = new THREE.Group();
      const tableTop = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.1, 1.2),
        new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.3 })
      );
      tableTop.position.y = 1.0;
      labTableGroup.add(tableTop);

      const flaskGeo = new THREE.ConeGeometry(0.2, 0.5, 16);
      const flaskMat = new THREE.MeshPhysicalMaterial({ color: '#38bdf8', transmission: 0.9, roughness: 0.1, ior: 1.5 });
      const flask = new THREE.Mesh(flaskGeo, flaskMat);
      flask.position.set(-0.6, 1.35, 0);
      labTableGroup.add(flask);

      const micBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.05, 0.4),
        new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.8 })
      );
      micBase.position.set(0.5, 1.05, 0);
      labTableGroup.add(micBase);

      const micArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.6, 0.2),
        new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.8 })
      );
      micArm.position.set(0.5, 1.38, -0.1);
      labTableGroup.add(micArm);

      labTableGroup.position.set(-5.5, 0, -2.0);
      scene.add(labTableGroup);
    }
  };

  const buildSolarSystemScene = (scene: THREE.Scene) => {
    const sunGeo = new THREE.SphereGeometry(1.2, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: '#fbbf24' });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sun);

    const sunLight = new THREE.PointLight('#fef08a', 2.5, 20);
    sun.add(sunLight);

    const orbitRingGeo = new THREE.RingGeometry(3.48, 3.52, 64);
    const orbitRingMat = new THREE.MeshBasicMaterial({ color: '#38bdf8', side: THREE.DoubleSide });
    const orbitRing = new THREE.Mesh(orbitRingGeo, orbitRingMat);
    orbitRing.rotation.x = Math.PI / 2;
    scene.add(orbitRing);

    const earthPivot = new THREE.Group();
    scene.add(earthPivot);

    const earthGroup = new THREE.Group();
    earthGroup.position.set(3.5, 0, 0);
    earthPivot.add(earthGroup);

    const earthGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const earthMat = new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.6, metalness: 0.1 });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earth.rotation.z = THREE.MathUtils.degToRad(23.5);
    earthRef.current = earth;
    earthGroup.add(earth);

    const moonPivot = new THREE.Group();
    earthGroup.add(moonPivot);
    moonPivotRef.current = moonPivot;

    const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const moonMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.8 });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(1.0, 0, 0);
    moonPivot.add(moon);
  };

  const buildDnaScene = (scene: THREE.Scene) => {
    const dnaGroup = new THREE.Group();
    dnaGroupRef.current = dnaGroup;
    scene.add(dnaGroup);

    const baseColors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b'];
    const pairsCount = 24;
    const radius = 1.0;
    const heightStep = 0.25;

    for (let i = 0; i < pairsCount; i++) {
      const angle = (i * 0.4) + (dnaUnwind * 0.1);
      const y = (i - pairsCount / 2) * heightStep;

      const x1 = Math.sin(angle) * radius;
      const z1 = Math.cos(angle) * radius;
      const x2 = Math.sin(angle + Math.PI) * radius;
      const z2 = Math.cos(angle + Math.PI) * radius;

      const nodeGeo = new THREE.SphereGeometry(0.12, 16, 16);
      const nodeMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.2, metalness: 0.5 });

      const node1 = new THREE.Mesh(nodeGeo, nodeMat);
      node1.position.set(x1, y, z1);
      dnaGroup.add(node1);

      const node2 = new THREE.Mesh(nodeGeo, nodeMat);
      node2.position.set(x2, y, z2);
      dnaGroup.add(node2);

      const rungDist = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
      const rungGeo = new THREE.CylinderGeometry(0.04, 0.04, rungDist, 12);
      const rungMat = new THREE.MeshStandardMaterial({ color: baseColors[i % 4], roughness: 0.3 });
      const rung = new THREE.Mesh(rungGeo, rungMat);

      rung.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
      rung.rotation.z = Math.PI / 2;
      rung.rotation.y = angle;
      dnaGroup.add(rung);
    }
  };

  const buildAtomScene = (scene: THREE.Scene) => {
    const atomGroup = new THREE.Group();
    atomGroupRef.current = atomGroup;
    scene.add(atomGroup);

    const nucGroup = new THREE.Group();
    const particleCount = atomElement === 'carbon' ? 12 : atomElement === 'oxygen' ? 16 : 30;

    for (let i = 0; i < particleCount; i++) {
      const pGeo = new THREE.SphereGeometry(0.16, 16, 16);
      const pMat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? '#ef4444' : '#3b82f6',
        roughness: 0.3,
        metalness: 0.2
      });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.set(
        (Math.random() - 0.5) * 0.6,
        (Math.random() - 0.5) * 0.6,
        (Math.random() - 0.5) * 0.6
      );
      nucGroup.add(pMesh);
    }
    atomGroup.add(nucGroup);

    electronsRef.current = [];
    const orbitCount = atomElement === 'carbon' ? 2 : atomElement === 'oxygen' ? 2 : 3;

    for (let o = 0; o < orbitCount; o++) {
      const radius = 1.4 + o * 0.8;
      const orbitRingGeo = new THREE.TorusGeometry(radius, 0.02, 16, 64);
      const orbitRingMat = new THREE.MeshBasicMaterial({ color: '#38bdf8' });
      const orbitRing = new THREE.Mesh(orbitRingGeo, orbitRingMat);

      orbitRing.rotation.x = Math.PI / 2 + (o * 0.6);
      orbitRing.rotation.y = o * 0.4;
      atomGroup.add(orbitRing);

      const electronGeo = new THREE.SphereGeometry(0.1, 16, 16);
      const electronMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0284c7', roughness: 0.1 });
      const electron = new THREE.Mesh(electronGeo, electronMat);
      electron.position.set(radius, 0, 0);

      orbitRing.add(electron);
      electronsRef.current.push(orbitRing);
    }
  };

  const buildGeometryScene = (scene: THREE.Scene) => {
    let geo: THREE.BufferGeometry;

    if (polyhedronType === 'cube') {
      geo = new THREE.BoxGeometry(2, 2, 2);
    } else if (polyhedronType === 'tetra') {
      geo = new THREE.TetrahedronGeometry(1.8);
    } else if (polyhedronType === 'octa') {
      geo = new THREE.OctahedronGeometry(1.8);
    } else {
      geo = new THREE.CylinderGeometry(1.2, 1.2, 2.4, 32);
    }

    const mat = new THREE.MeshStandardMaterial({
      color: '#3b82f6',
      roughness: 0.3,
      metalness: 0.2,
      wireframe: wireframeMode
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    polyMeshRef.current = mesh;
    scene.add(mesh);

    if (!wireframeMode) {
      const wireMat = new THREE.MeshBasicMaterial({ color: '#ffffff', wireframe: true });
      const wireMesh = new THREE.Mesh(geo, wireMat);
      mesh.add(wireMesh);
    }
  };

  return (
    <div className="relative w-full h-[75vh] min-h-[500px] bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col font-sans dir-rtl select-none">
      {/* Top Header & Mode Selectors */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700/80 shadow-xl pointer-events-auto">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="text-xs font-black text-white leading-tight">المخبر الثلاثي الأبعاد 3D</h2>
            <p className="text-[10px] text-slate-400">قسم {activeClass.name} • التحكم في ظهور العناصر</p>
          </div>
        </div>

        {/* Scene Mode Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/80 shadow-xl pointer-events-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setSceneMode('classroom')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              sceneMode === 'classroom' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>عرض القسم</span>
          </button>
          <button
            type="button"
            onClick={() => setSceneMode('solar')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              sceneMode === 'solar' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>النظام الشمسي</span>
          </button>
          <button
            type="button"
            onClick={() => setSceneMode('dna')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              sceneMode === 'dna' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Dna className="w-3.5 h-3.5" />
            <span>الحمض النووي DNA</span>
          </button>
          <button
            type="button"
            onClick={() => setSceneMode('atom')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              sceneMode === 'atom' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Atom className="w-3.5 h-3.5" />
            <span>النموذج الذري</span>
          </button>
          <button
            type="button"
            onClick={() => setSceneMode('geometry')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              sceneMode === 'geometry' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>المجسمات الهندسية</span>
          </button>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white hover:bg-rose-600 transition flex items-center justify-center pointer-events-auto cursor-pointer shadow-xl"
            title="إغلاق المشهد الثلاثي الأبعاد"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main WebGL Canvas Container */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Student Hover Details Overlay in Classroom Mode */}
      {sceneMode === 'classroom' && hoveredStudent && (
        <div className="absolute top-20 right-6 z-20 bg-slate-900/90 border border-blue-500/40 backdrop-blur-md p-4 rounded-2xl shadow-2xl text-white max-w-xs transition animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="font-black text-sm text-blue-300">{hoveredStudent.lastName} {hoveredStudent.firstName}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              hoveredStudent.attendance === 'absent' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {hoveredStudent.attendance === 'absent' ? 'غائب ❌' : 'حاضر ✓'}
            </span>
          </div>
          <div className="text-xs text-slate-300 space-y-1">
            <p>• الفوج: {hoveredStudent.group}</p>
            <p>• رقم الطاولة: {(hoveredStudent.seatIndex ?? 0) + 1}</p>
            <p>• النقاط والمشاركة: <span className="font-bold text-amber-400">{hoveredStudent.bonusPoints > 0 ? `+${hoveredStudent.bonusPoints}` : hoveredStudent.bonusPoints}</span></p>
          </div>
          <p className="text-[10px] text-blue-400 mt-2 font-bold">انقر فوق الطاولة لعرض الملف الكامل للتلميذ</p>
        </div>
      )}

      {/* Collapsible Bottom Control Dock */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 max-w-[94vw] w-[860px] flex flex-col items-center pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsControlsExpanded(!isControlsExpanded)}
          className="bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white px-4 py-1 rounded-t-xl border-t border-x border-slate-700 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-lg"
        >
          <span>{isControlsExpanded ? '▾ إخفاء لوحة التحكم والعناصر' : '▴ إظهار لوحة التحكم وعناصر القسم'}</span>
        </button>

        {isControlsExpanded && (
          <div className="w-full bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 p-3.5 rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-4 text-slate-200">
            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  isPlaying ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                }`}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? 'إيقاف الحركة' : 'تشغيل الحركة'}</span>
              </button>

              <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs">
                <span className="px-2 text-[10px] text-slate-400 font-bold">السرعة:</span>
                {[0.5, 1, 2].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpeedMultiplier(s)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      speedMultiplier === s ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Classroom Object Visibility Toggles (Only in Classroom Mode) */}
            {sceneMode === 'classroom' && (
              <div className="flex items-center gap-2 flex-wrap bg-slate-800/60 p-1.5 rounded-xl border border-slate-700">
                <span className="text-[11px] text-slate-400 font-bold px-1">إظهار/إخفاء عناصر القسم:</span>
                {[
                  { label: 'طاولات التلاميذ', val: showDesks, setVal: setShowDesks },
                  { label: 'السبورة والمكتب', val: showBoard, setVal: setShowBoard },
                  { label: 'الجدران والأرضية', val: showWalls, setVal: setShowWalls },
                  { label: 'أجهزة المخبر', val: showLabEquipment, setVal: setShowLabEquipment }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => item.setVal(!item.val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      item.val ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.val && <Check className="w-3 h-3" />}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Mode Specific Controls */}
            {sceneMode === 'dna' && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-300 font-bold">فك اللولب:</span>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={dnaUnwind}
                  onChange={(e) => setDnaUnwind(Number(e.target.value))}
                  className="w-32 accent-blue-500 cursor-pointer"
                />
              </div>
            )}

            {sceneMode === 'atom' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300 font-bold">العنصر:</span>
                {(['carbon', 'oxygen', 'gold'] as const).map((elem) => (
                  <button
                    key={elem}
                    type="button"
                    onClick={() => setAtomElement(elem)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      atomElement === elem ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {elem === 'carbon' ? 'الكربون (C)' : elem === 'oxygen' ? 'الأكسجين (O)' : 'الذهب (Au)'}
                  </button>
                ))}
              </div>
            )}

            {sceneMode === 'geometry' && (
              <div className="flex items-center gap-2">
                {(['cube', 'tetra', 'octa', 'cylinder'] as const).map((poly) => (
                  <button
                    key={poly}
                    type="button"
                    onClick={() => setPolyhedronType(poly)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      polyhedronType === poly ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {poly === 'cube' ? 'مكعب' : poly === 'tetra' ? 'هرم رباعي' : poly === 'octa' ? 'ثماني أوجه' : 'أسطوانة'}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setWireframeMode(!wireframeMode)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    wireframeMode ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  شبكي
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
