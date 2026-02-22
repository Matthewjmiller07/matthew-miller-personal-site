import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Slider } from './ui/slider';
import { 
  Download, Type, Image as ImageIcon, Trash2, Copy, 
  Plus, Settings, Layers, Undo, GripVertical, ZoomIn, RotateCcw
} from 'lucide-react';

// Element types that can be placed on the canvas
type ElementType = 'email' | 'logo';

type LogoCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface Position {
  x: number;
  y: number;
}

interface CanvasElement {
  id: string;
  type: ElementType;
  name: string;
  position: Position;
  zIndex: number;
  // Email-specific
  local?: string;
  domain?: string;
  tld?: string;
  handle?: string;
  fontSize?: number;
  bracketStyle?: string;
  labelName?: string;
  labelSite?: string;
  labelEmail?: string;
  labelInstagram?: string;
  font?: string;
  weight?: string;
  color?: string;
  letterSpacing?: number;
  // Logo-specific
  imageUrl?: string;
  size?: number;
  opacity?: number;
  corner?: LogoCorner;
}

interface CanvasState {
  width: number;
  height: number;
  backgroundColor: string;
  elements: CanvasElement[];
}

interface HistoryState {
  canvas: CanvasState;
}

const fontOptions = [
  { value: "'Cormorant Garamond', serif", label: "Cormorant Garamond" },
  { value: "'EB Garamond', serif", label: "EB Garamond" },
  { value: "'Playfair Display', serif", label: "Playfair Display" },
  { value: "'Lora', serif", label: "Lora" },
  { value: "Inter, sans-serif", label: "Inter (sans)" }
];

const weightOptions = ['200', '300', '400', '500', '600', '700'];

const bracketOptions = [
  { value: 'bar', label: 'Bar (original)' },
  { value: 'brace', label: 'Curly brace' },
  { value: 'underline', label: 'Underline box' },
  { value: 'none', label: 'None' }
];

export default function CanvaBusinessCard() {
  // Standard LinkedIn banner size: 1584 x 396 pixels
  // Using 1200 x 300 for better display while maintaining 4:1 ratio
  
  // Calculate email width for proper centering
const calculateEmailWidth = (element: CanvasElement) => {
  const fontSize = element.fontSize || 21;
  const avgCharWidth = fontSize * 0.55;
  return ((element.local?.length || 0) + 1 + (element.domain?.length || 0) + (element.tld || '.com').length) * avgCharWidth;
};

  // Create initial email element with proper centering
  const initialEmail = {
    id: 'email-1',
    type: 'email' as ElementType,
    name: 'Email',
    position: { x: 0, y: 0 }, // Will be calculated
    zIndex: 2,
    local: 'Matthew',
    domain: 'TheOtherMatthewMiller',
    tld: '.com',
    handle: 'TheOtherMatthewMiller',
    fontSize: 21,
    bracketStyle: 'bar',
    labelName: 'Name',
    labelSite: 'Site',
    labelEmail: 'Email',
    labelInstagram: 'Instagram',
    font: "'Cormorant Garamond', serif",
    weight: '400',
    color: '#ffffff',
    letterSpacing: 0.02
  };
  
  // Simple approach: position at canvas center and let SVG handle alignment
  const centeredX = 600; // Canvas center X - locked to center
  const centeredY = 150; // Canvas center Y - locked to center
  
  console.log('🔥 Initial State Debug: Setting position to', { x: centeredX, y: centeredY });
  initialEmail.position = { x: centeredX, y: centeredY };

  const [canvas, setCanvas] = useState<CanvasState>({
    width: 1200,
    height: 300,
    backgroundColor: '#0a66c2', // LinkedIn blue
    elements: [initialEmail]
  });

  const [selectedElementId, setSelectedElementId] = useState<string | null>('email-1');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; size: number } | null>(null);
  const [currentResizeSize, setCurrentResizeSize] = useState<number | null>(null);
  const [alignmentGuides, setAlignmentGuides] = useState<{ vertical?: number; horizontal?: number }>({});
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedElement = canvas.elements.find((el: CanvasElement) => el.id === selectedElementId);

  // Save to history
  const saveHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      canvas: JSON.parse(JSON.stringify(canvas))
    });
    if (newHistory.length > 50) newHistory.shift(); // Limit history
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [canvas, history, historyIndex]);

  // Reset canvas to initial state
  const resetCanvas = () => {
    const initialEmail = {
      id: 'email-1',
      type: 'email' as ElementType,
      name: 'Email',
      position: { x: 0, y: 0 }, // Will be calculated
      zIndex: 2,
      local: 'Matthew',
      domain: 'TheOtherMatthewMiller',
      tld: '.com',
      handle: 'TheOtherMatthewMiller',
      fontSize: 21,
      bracketStyle: 'bar',
      labelName: 'Name',
      labelSite: 'Site',
      labelEmail: 'Email',
      labelInstagram: 'Instagram',
      font: "'Cormorant Garamond', serif",
      weight: '400',
      color: '#ffffff',
      letterSpacing: 0.02
    };
    
    // Simple approach: position at canvas center and let SVG handle alignment
    const centeredX = 600; // Canvas center X - locked to center
    const centeredY = 150; // Canvas center Y - locked to center
    
    console.log('🔥 Reset Debug: Setting position to', { x: centeredX, y: centeredY });
    initialEmail.position = { x: centeredX, y: centeredY };
    
    setCanvas({
      width: 1200,
      height: 300,
      backgroundColor: '#0a66c2', // LinkedIn blue
      elements: [initialEmail]
    });
    setSelectedElementId('email-1');
    setHistory([]);
    setHistoryIndex(-1);
  };

  // Undo
  const undo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setCanvas(JSON.parse(JSON.stringify(prevState.canvas)));
      setHistoryIndex(historyIndex - 1);
    }
  };

  // Redo
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setCanvas(JSON.parse(JSON.stringify(nextState.canvas)));
      setHistoryIndex(historyIndex + 1);
    }
  };
  // Add new element to canvas
  const addElement = (type: ElementType) => {
    saveHistory();
    const newElement: CanvasElement = {
      id: `${type}-${Date.now()}`,
      type,
      name: type.charAt(0).toUpperCase() + type.slice(1),
      position: { x: 100, y: 100 },
      zIndex: Math.max(...canvas.elements.map((el: CanvasElement) => el.zIndex), 0) + 1
    };

    switch (type) {
      case 'email':
        Object.assign(newElement, {
          local: 'Matthew',
          domain: 'TheOtherMatthewMiller',
          tld: '.com',
          handle: 'TheOtherMatthewMiller',
          fontSize: 21,
          bracketStyle: 'bar',
          labelName: 'Name',
          labelSite: 'Site',
          labelEmail: 'Email',
          labelInstagram: 'Instagram',
          font: "'Cormorant Garamond', serif",
          weight: '400',
          color: '#ffffff',
          letterSpacing: 0.02
        });
        // Position email element at canvas center
        newElement.position = { x: 600, y: 150 }; // Canvas center - locked position
        break;
      case 'logo':
        Object.assign(newElement, {
          imageUrl: '',
          size: 80,
          opacity: 1,
          corner: 'top-right' as LogoCorner
        });
        // Position logo in corner
        newElement.position = getCornerPosition('top-right' as LogoCorner, 80);
        break;
    }

    setCanvas(prev => ({
      ...prev,
      elements: [...prev.elements, newElement]
    }));
    setSelectedElementId(newElement.id);
  };

  // Get corner position for logo
  const getCornerPosition = (corner: LogoCorner, size: number): Position => {
    const padding = 20;
    switch (corner) {
      case 'top-left':
        return { x: padding, y: padding };
      case 'top-right':
        return { x: canvas.width - size - padding, y: padding };
      case 'bottom-left':
        return { x: padding, y: canvas.height - size - padding };
      case 'bottom-right':
        return { x: canvas.width - size - padding, y: canvas.height - size - padding };
      default:
        return { x: padding, y: padding };
    }
  };

  // Update logo corner
  const updateLogoCorner = (elementId: string, corner: LogoCorner) => {
    const element = canvas.elements.find(el => el.id === elementId);
    if (element && element.type === 'logo') {
      const newPosition = getCornerPosition(corner, element.size || 80);
      updateElement(elementId, { corner, position: newPosition });
    }
  };

  // Update element property
  const updateElement = (id: string, updates: Partial<CanvasElement>) => {
    setCanvas(prev => ({
      ...prev,
      elements: prev.elements.map((el: CanvasElement) => 
        el.id === id ? { ...el, ...updates } : el
      )
    }));
  };

  // Delete element
  const deleteElement = (id: string) => {
    saveHistory();
    setCanvas(prev => ({
      ...prev,
      elements: prev.elements.filter((el: CanvasElement) => el.id !== id)
    }));
    setSelectedElementId(null);
  };

  // Duplicate element
  const duplicateElement = (id: string) => {
    saveHistory();
    const element = canvas.elements.find((el: CanvasElement) => el.id === id);
    if (!element) return;

    const newElement = {
      ...element,
      id: `${element.type}-${Date.now()}`,
      name: `${element.name} Copy`,
      position: { x: element.position.x + 20, y: element.position.y + 20 },
      zIndex: Math.max(...canvas.elements.map((el: CanvasElement) => el.zIndex), 0) + 1
    };

    setCanvas(prev => ({
      ...prev,
      elements: [...prev.elements, newElement]
    }));
    setSelectedElementId(newElement.id);
  };

  // Bring to front
  const bringToFront = (id: string) => {
    const maxZ = Math.max(...canvas.elements.map((el: CanvasElement) => el.zIndex), 0);
    updateElement(id, { zIndex: maxZ + 1 });
  };

  // Send to back
  const sendToBack = (id: string) => {
    const minZ = Math.min(...canvas.elements.map((el: CanvasElement) => el.zIndex), 0);
    updateElement(id, { zIndex: minZ - 1 });
  };

  // Reorder layers
  const moveLayer = (fromIndex: number, toIndex: number) => {
    saveHistory();
    const sortedElements = [...canvas.elements].sort((a: CanvasElement, b: CanvasElement) => b.zIndex - a.zIndex);
    const [moved] = sortedElements.splice(fromIndex, 1);
    sortedElements.splice(toIndex, 0, moved);
    
    // Reassign z-indexes
    const updatedElements = sortedElements.map((el: CanvasElement, idx: number) => ({
      ...el,
      zIndex: sortedElements.length - idx
    }));

    setCanvas(prev => ({
      ...prev,
      elements: updatedElements
    }));
  };

  // Mouse handlers for dragging
  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    if (e.button !== 0) return; // Only left click
    
    const element = canvas.elements.find((el: CanvasElement) => el.id === elementId);
    if (!element) return;

    setSelectedElementId(elementId);
    setIsDragging(true);
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scale = rect.width / canvas.width;
    const clickX = (e.clientX - rect.left) / scale;
    const clickY = (e.clientY - rect.top) / scale;

    setDragOffset({
      x: clickX - element.position.x,
      y: clickY - element.position.y
    });
  };

  // Check if element is near alignment points and return alignment guides with element dimensions
  const checkAlignment = (x: number, y: number, element: CanvasElement): { 
    guides: { vertical?: number; horizontal?: number }, 
    elementWidth: number, 
    elementHeight: number 
  } => {
    const guides = { vertical: undefined as number | undefined, horizontal: undefined as number | undefined };
    const threshold = 10; // pixels
    
    // Get element dimensions including all visual parts
    let elementWidth = 0;
    let elementHeight = 0;
    
    if (element.type === 'email') {
      // Match the exact rendering logic from renderEmailBrackets
      const fontSize = element.fontSize || 14;
      const avgCharWidth = fontSize * 0.6;
      const textWidth = ((element.local?.length || 0) + (element.domain?.length || 0) + 1) * avgCharWidth;
      
      // Calculate the full width including padding (matches SVG width in render)
      elementWidth = Math.min(textWidth + (fontSize * 0.5), canvas.width - 40);
      
      // Calculate full height including all brackets and labels
      const lineOffset = fontSize * 1.4;  // Top brackets
      const bottomBracketOffset = fontSize * 2.0; // Space for Instagram bracket
      const labelHeight = fontSize * 0.8 + 6; // Label gap + text height
      
      // Total height includes:
      // - Top labels (lineOffset + labelHeight)
      // - Main text area (fontSize * 1.2)
      // - Bottom brackets (bottomBracketOffset + labelHeight)
      elementHeight = (lineOffset + labelHeight) + (fontSize * 1.2) + (bottomBracketOffset + labelHeight);
      
      // Adjust y position to account for the full visual bounds
      y -= (elementHeight - (fontSize * 1.2)) / 2; // Center the visual bounds
    } else if (element.type === 'logo') {
      elementWidth = element.size || 80;
      elementHeight = element.size || 80;
    } else {
      // Fallback for other elements
      elementWidth = 100;
      elementHeight = (element.fontSize || 14) * 1.2;
    }
    
    // Calculate visual center of the element including all decorations
    const elCenterX = x + elementWidth / 2;
    const elCenterY = y + elementHeight / 2;
    
    // Canvas center
    const canvasCenterX = canvas.width / 2;
    const canvasCenterY = canvas.height / 2;
    
    // Check canvas center alignment with fixed guide lines
    if (Math.abs(elCenterX - canvasCenterX) <= threshold) {
      guides.vertical = Math.round(canvasCenterX);
    }
    if (Math.abs(elCenterY - canvasCenterY) <= threshold) {
      guides.horizontal = Math.round(canvasCenterY);
    }
    
    // Check other elements for alignment
    canvas.elements.forEach((el: CanvasElement) => {
      if (el.id === element.id) return;
      
      const otherX = el.position.x;
      const otherY = el.position.y;
      const otherWidth = el.type === 'email' 
        ? ((el.local?.length || 0) + 1 + (el.domain?.length || 0)) * (el.fontSize || 14) * 0.6 
        : el.type === 'logo' ? (el.size || 80) : 100;
      const otherHeight = (el.fontSize || 14) * 1.2;
      const otherCenterX = otherX + otherWidth / 2;
      const otherCenterY = otherY + otherHeight / 2;
      
      // Check vertical alignment with other elements
      if (Math.abs(elCenterX - otherCenterX) < threshold) {
        guides.vertical = Math.round(otherCenterX);
      }
      
      // Check horizontal alignment with other elements
      if (Math.abs(elCenterY - otherCenterY) < threshold) {
        guides.horizontal = Math.round(otherCenterY);
      }
    });
    
    setAlignmentGuides(guides);
    return { guides, elementWidth, elementHeight };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selectedElementId) return;

    if (isDragging) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const scale = rect.width / canvas.width;
      let x = (e.clientX - rect.left) / scale - dragOffset.x;
      let y = (e.clientY - rect.top) / scale - dragOffset.y;
      
      // Constrain to canvas bounds
      x = Math.max(0, Math.min(x, canvas.width - 50));
      y = Math.max(0, Math.min(y, canvas.height - 50));
      
      // Check for alignment with visual bounds
      const element = canvas.elements.find(el => el.id === selectedElementId);
      if (element) {
        // Get element bounds including all visual parts
        const { guides, elementWidth, elementHeight } = checkAlignment(x, y, element);
        
        // Snap to guides with a small threshold
        const snapThreshold = 10; // pixels
        if (guides.vertical !== undefined) {
          const distToGuide = Math.abs((x + elementWidth / 2) - guides.vertical);
          if (distToGuide <= snapThreshold) {
            x = guides.vertical - elementWidth / 2;
          }
        }
        if (guides.horizontal !== undefined) {
          const distToGuide = Math.abs((y + elementHeight / 2) - guides.horizontal);
          if (distToGuide <= snapThreshold) {
            y = guides.horizontal - elementHeight / 2;
          }
        }
      }
      
      updateElement(selectedElementId, {
        position: { x, y }
      });
    } else if (isResizing && resizeStart) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const scale = rect.width / canvas.width;
      const currentX = (e.clientX - rect.left) / scale;
      const currentY = (e.clientY - rect.top) / scale;
      
      // Calculate size change based on mouse movement (more precise control)
      const deltaX = currentX - resizeStart.x;
      const deltaY = currentY - resizeStart.y;
      // Use the larger of the two deltas for more natural resizing
      const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
      
      // Allow smaller sizes with a minimum of 8px
      const newSize = Math.max(8, resizeStart.size + (delta * 0.8));
      
      // Update current resize size for display
      setCurrentResizeSize(Math.round(newSize));
      
      // Update the resize start position for smoother continuous resizing
      setResizeStart(prev => ({
        ...prev!,
        x: currentX,
        y: currentY,
        size: newSize
      }));

      const element = selectedElement;
      if (element?.type === 'email') {
        updateElement(selectedElementId, { fontSize: newSize });
      } else if (element?.type === 'logo') {
        updateElement(selectedElementId, { size: newSize });
      }
    }
  };

  const handleMouseUp = (e?: MouseEvent) => {
    if (isDragging || isResizing) {
      saveHistory();
    }
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleMouseMove as any);
    document.removeEventListener('mouseup', handleMouseUp as any);
    
    setIsDragging(false);
    setIsResizing(false);
    setResizeStart(null);
    setCurrentResizeSize(null);
    setAlignmentGuides({}); // Clear alignment guides
  };

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent text selection during resize
    
    const element = canvas.elements.find((el: CanvasElement) => el.id === elementId);
    if (!element) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scale = rect.width / canvas.width;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    // Get current size with appropriate fallbacks
    let size = 0;
    if (element.type === 'email') size = element.fontSize || 14;
    else if (element.type === 'logo') size = element.size || 80;

    // Add event listeners for smoother dragging
    document.addEventListener('mousemove', handleMouseMove as any);
    document.addEventListener('mouseup', handleMouseUp as any);

    setIsResizing(true);
    setResizeStart({ x, y, size });
  };

  // Handle logo upload
  const handleLogoUpload = (elementId: string, file: File) => {
    saveHistory();
    const reader = new FileReader();
    reader.onload = () => {
      updateElement(elementId, { imageUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  // Export functionality - simplified
  const exportSVG = () => {
    if (!svgRef.current) return;
    
    // Create a proper SVG string
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgRef.current);
    
    // Ensure proper SVG namespaces
    svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"');
    
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'linkedin-banner.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Render bracket and labels for email element
  const renderEmailBrackets = (element: CanvasElement, forExport: boolean = false) => {
    if (!element.local || !element.domain) return null;

    const fontSize = element.fontSize || 14;
    // Use more accurate character width for serif fonts
    const avgCharWidth = fontSize * 0.55; // Reduced for better fit with serif fonts
    const localWidth = element.local.length * avgCharWidth;
    const atWidth = fontSize * 0.6; // More accurate @ width
    const domainWidth = element.domain.length * avgCharWidth;
    const tldWidth = (element.tld || '.com').length * avgCharWidth;
    const handleWidth = (element.handle || '').length * avgCharWidth;
    
    const labelGap = fontSize * 0.8;  // Space between bracket and label
    const lineOffset = fontSize * 1.4;  // Increased vertical space for top brackets
    const cap = fontSize * 0.7;        // Reduced from 14px
    const tick = fontSize * 0.5;       // Reduced from 10px
    
    const y = 0; // Changed: brackets relative to text baseline
    const topY = -lineOffset;
    const bottomY = lineOffset;
    // Position Instagram bracket with more space to prevent overlap
    const bottomY2 = bottomY + (fontSize * 2.0);  // Increased spacing to prevent Instagram bracket overlap

    // Calculate text width and center offset for bracket positioning
    const totalTextWidth = localWidth + atWidth + domainWidth + tldWidth;
    const centerOffset = -totalTextWidth / 2; // Offset to center brackets with text

    const localX = centerOffset;
    const localX2 = centerOffset + localWidth;
    const domainX = localX2 + atWidth;
    const domainX2 = domainX + domainWidth;
    const tldX = domainX2;
    const tldX2 = tldX + tldWidth;

    const drawBracket = (x1: number, x2: number, yPos: number, label: string, isTop: boolean) => {
      const elements = [];
      
      if (element.bracketStyle === 'bar') {
        elements.push(
          <line key={`${label}-line`} x1={x1} y1={yPos} x2={x2} y2={yPos} stroke={element.color} strokeWidth="2" />,
          <line key={`${label}-cap1`} x1={x1} y1={yPos} x2={x1} y2={yPos + (isTop ? cap : -cap)} stroke={element.color} strokeWidth="2" />,
          <line key={`${label}-cap2`} x1={x2} y1={yPos} x2={x2} y2={yPos + (isTop ? cap : -cap)} stroke={element.color} strokeWidth="2" />,
          <line key={`${label}-tick`} x1={(x1+x2)/2} y1={yPos} x2={(x1+x2)/2} y2={yPos + (isTop ? -tick : tick)} stroke={element.color} strokeWidth="2" />
        );
      } else if (element.bracketStyle === 'brace') {
        const dirToLabel = isTop ? 1 : -1;
        const h = fontSize * 1.1, wC = fontSize * 0.8;  // Made proportional to font size
        const d = `
          M ${x1} ${yPos} c 0 ${dirToLabel*h/2}, ${-wC} ${dirToLabel*h/2}, ${-wC} ${dirToLabel*h}
          m 0 ${-dirToLabel*h} c 0 ${-dirToLabel*h/2}, ${wC} ${-dirToLabel*h/2}, ${wC} ${-dirToLabel*h}
          M ${x2} ${yPos} c 0 ${dirToLabel*h/2}, ${wC} ${dirToLabel*h/2}, ${wC} ${dirToLabel*h}
          m 0 ${-dirToLabel*h} c 0 ${-dirToLabel*h/2}, ${-wC} ${-dirToLabel*h/2}, ${-wC} ${-dirToLabel*h}
          M ${x1} ${yPos} L ${x2} ${yPos}
        `;
        elements.push(
          <path key={`${label}-brace`} d={d} fill="none" stroke={element.color} strokeWidth="2" />,
          <line key={`${label}-tick`} x1={(x1+x2)/2} y1={yPos} x2={(x1+x2)/2} y2={yPos + (isTop ? -tick : tick)} stroke={element.color} strokeWidth="2" />
        );
      } else if (element.bracketStyle === 'underline') {
        const offset = fontSize * 0.7 * (isTop ? 1 : -1);  // Made proportional to font size
        elements.push(
          <path key={`${label}-underline`} d={`M ${x1} ${yPos+offset} L ${x2} ${yPos+offset}`} stroke={element.color} strokeWidth="2" fill="none" />,
          <line key={`${label}-tick`} x1={(x1+x2)/2} y1={yPos + (isTop ? -fontSize*0.7 : fontSize*0.7)} x2={(x1+x2)/2} y2={yPos + (isTop ? -(fontSize*0.7+tick) : (fontSize*0.7+tick))} stroke={element.color} strokeWidth="2" />
        );
      }

      if (label && element.bracketStyle !== 'none') {
        elements.push(
          <text
            key={`${label}-text`}
            x={(x1 + x2) / 2}
            y={isTop ? yPos - labelGap - 6 : yPos + labelGap + 6}
            textAnchor="middle"
            fontSize={Math.max(10, Math.min(14, fontSize * 0.7))}
            fontFamily="'Cormorant Garamond', serif"
            fill={element.color}
            dominantBaseline={isTop ? 'auto' : 'hanging'}
          >
            {label}
          </text>
        );
      }

      return elements;
    };

    return (
      <g>
        {drawBracket(localX, localX2, topY, element.labelName || '', true)}
        {drawBracket(domainX, domainX2, topY, element.labelSite || '', true)}
        {element.handle && (
          (() => {
            // Make bracket slightly shorter to account for font rendering differences
            const bracketEnd = domainX2 - (domainWidth * 0.15); // 15% adjustment
            return drawBracket(localX2, bracketEnd, bottomY - (fontSize * 0.3), element.labelInstagram || 'Instagram', false);
          })()
        )}
        {drawBracket(localX, domainX2, bottomY2, element.labelEmail || '', false)}
      </g>
    );
  };

  // Render canvas element
  const renderCanvasElement = (element: CanvasElement) => {
    const isSelected = element.id === selectedElementId;
    const style: React.CSSProperties = {
      position: 'absolute',
      left: element.position.x,
      top: element.position.y,
      cursor: 'move',
      zIndex: element.zIndex,
      outline: isSelected ? '2px solid #3b82f6' : 'none',
      outlineOffset: '4px',
      userSelect: 'none'
    };

    switch (element.type) {
      case 'email':
        const fontSize = element.fontSize || 14;
        // Use more accurate character width for serif fonts
        const avgCharWidth = fontSize * 0.55; // Reduced for better fit with serif fonts
        const totalWidth = ((element.local?.length || 0) + 1 + (element.domain?.length || 0) + (element.tld || '.com').length) * avgCharWidth;
        
        console.log('🔥 Render Debug: Element position', element.position, 'totalWidth', totalWidth);
        
        return (
          <div
            key={element.id}
            style={style}
            onMouseDown={(e) => handleMouseDown(e, element.id)}
          >
            <svg
              width={Math.min(totalWidth + (fontSize * 1.0), canvas.width - 40)}
              height={fontSize * 3.5}  // Increased height to prevent bracket overlap
              style={{ overflow: 'visible' }}
            >
              <defs>
                <style>
                  {`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@200;300;400;500;600;700&family=EB+Garamond:wght@400;500;600;700&family=Lora:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@200;300;400;500;600;700&display=swap');`}
                </style>
              </defs>
              <g transform={`translate(${(totalWidth + fontSize * 1.0) / 2}, ${fontSize * 1.4})`}>
                {renderEmailBrackets(element, false)}
                <text
                  x={0}
                  y={0}
                  dominantBaseline="middle"
                  textAnchor="middle"
                  fontFamily={element.font}
                  fontWeight={element.weight}
                  fontSize={fontSize}
                  fill={element.color}
                  letterSpacing={`${element.letterSpacing}em`}
                >
                  {element.local}@{element.domain}{element.tld || '.com'}
                </text>
              </g>
            </svg>
            {isSelected && (
              <>
                <div
                  onMouseDown={(e) => handleResizeStart(e, element.id)}
                  className="absolute -bottom-2 -right-2 w-6 h-6 bg-blue-500 rounded-full cursor-nwse-resize flex items-center justify-center"
                  title="Drag to resize"
                >
                  <ZoomIn className="w-3 h-3 text-white" />
                </div>
                {isResizing && selectedElementId === element.id && currentResizeSize && (
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded">
                    {currentResizeSize}px
                  </div>
                )}
              </>
            )}
          </div>
        );

      case 'logo':
        if (!element.imageUrl) {
          return (
            <div
              key={element.id}
              style={{
                ...style,
                width: element.size,
                height: element.size,
                border: '2px dashed #ccc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f9f9f9'
              }}
              onMouseDown={(e) => handleMouseDown(e, element.id)}
              onClick={() => {
                setSelectedElementId(element.id);
                fileInputRef.current?.click();
              }}
            >
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
          );
        }
        return (
          <div
            key={element.id}
            style={style}
            onMouseDown={(e) => handleMouseDown(e, element.id)}
          >
            <img
              src={element.imageUrl}
              alt="Logo"
              style={{
                width: element.size,
                height: element.size,
                opacity: element.opacity,
                objectFit: 'contain',
                pointerEvents: 'none'
              }}
            />
            {isSelected && (
              <div
                onMouseDown={(e) => handleResizeStart(e, element.id)}
                className="absolute -bottom-2 -right-2 w-6 h-6 bg-blue-500 rounded-full cursor-nwse-resize flex items-center justify-center"
                title="Drag to resize"
              >
                <ZoomIn className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-semibold text-slate-900">LinkedIn Banner Designer</h1>
          <p className="text-slate-600">Drag and drop elements • Use resize handles to scale</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr_350px] gap-6">
          {/* Left Sidebar - Add Elements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Elements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={() => addElement('email')} 
                className="w-full justify-start"
                variant="outline"
              >
                <Type className="h-4 w-4 mr-2" />
                Email with Brackets
              </Button>
              <Button 
                onClick={() => addElement('logo')} 
                className="w-full justify-start"
                variant="outline"
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Logo
              </Button>
              <Button 
                onClick={resetCanvas} 
                className="w-full justify-start"
                variant="destructive"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Banner
              </Button>

              <div className="pt-4 border-t">
                <Label className="mb-2 block">Canvas Settings</Label>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Background Color</Label>
                    <Input
                      type="color"
                      value={canvas.backgroundColor}
                      onChange={(e) => setCanvas(prev => ({ ...prev, backgroundColor: e.target.value }))}
                      className="h-10 w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Label className="mb-2 block flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Layers (drag to reorder)
                </Label>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {[...canvas.elements]
                    .sort((a, b) => b.zIndex - a.zIndex)
                    .map((el, index) => (
                      <div
                        key={el.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', index.toString());
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                          moveLayer(fromIndex, index);
                        }}
                        onClick={() => setSelectedElementId(el.id)}
                        className={`p-2 text-sm rounded cursor-move flex items-center gap-2 ${
                          el.id === selectedElementId ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-100'
                        }`}
                      >
                        <GripVertical className="w-3 h-3 flex-shrink-0" />
                        <span className="flex-1">
                          {el.type === 'email' && '📧 '}
                          {el.type === 'logo' && '🖼️ '}
                          {el.name}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Canvas Container */}
          <div className="bg-white rounded-xl shadow-xl p-6">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-lg font-medium text-slate-700">
                LinkedIn Banner
              </h2>
              <div className="text-sm text-slate-500">
                {canvas.width} x {canvas.height}px (4:1 ratio)
              </div>
            </div>
            
            {/* Canvas Preview with proper aspect ratio */}
            <div className="relative bg-slate-50 rounded-lg p-4 overflow-hidden">
              <div 
                className="mx-auto relative bg-white border-2 border-slate-200 rounded shadow-sm"
                style={{
                  width: '100%',
                  maxWidth: '1200px',
                  aspectRatio: '4/1',
                  minHeight: '200px',
                  maxHeight: '400px'
                }}
              >
                <div
                  ref={canvasRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    backgroundColor: canvas.backgroundColor,
                    backgroundImage: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                    boxSizing: 'border-box',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {/* Alignment Guides */}
                  {alignmentGuides.vertical !== undefined && (
                    <div 
                      className="absolute top-0 bottom-0 w-px bg-blue-500 z-10 pointer-events-none"
                      style={{ left: `${(alignmentGuides.vertical / canvas.width) * 100}%` }}
                    />
                  )}
                  {alignmentGuides.horizontal !== undefined && (
                    <div 
                      className="absolute left-0 right-0 h-px bg-blue-500 z-10 pointer-events-none"
                      style={{ top: `${(alignmentGuides.horizontal / canvas.height) * 100}%` }}
                    />
                  )}
                  
                  {/* Canvas Background */}
                  <div
                    className="absolute inset-0"
                    style={{ backgroundColor: canvas.backgroundColor }}
                    onClick={() => setSelectedElementId(null)}
                  />
                  
                  {/* Render all elements */}
                  {canvas.elements.map(renderCanvasElement)}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Properties & Export */}
          <div className="space-y-6">
            {/* Properties Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Properties
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedElement ? (
                  <div className="space-y-4">
                    {/* Email-specific Properties */}
                    {selectedElement.type === 'email' && (
                      <EmailProperties element={selectedElement} updateElement={updateElement} />
                    )}

                    {/* Logo-specific Properties */}
                    {selectedElement.type === 'logo' && (
                      <LogoProperties 
                        element={selectedElement} 
                        updateElement={updateElement} 
                        handleLogoUpload={handleLogoUpload}
                        updateLogoCorner={updateLogoCorner}
                      />
                    )}
                  </div>
                ) : (
                  <div className="text-center text-slate-500 py-8">
                    <p>Select an element to edit its properties</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Export Controls */}
            <Card>
              <CardContent className="p-4 flex gap-2 justify-center flex-wrap">
                <Button onClick={exportSVG} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export SVG
                </Button>
                <Button 
                  onClick={undo}
                  variant="outline"
                  disabled={historyIndex < 1}
                  className="flex items-center gap-2"
                >
                  <Undo className="h-4 w-4" />
                  Undo
                </Button>
                {selectedElement && (
                  <>
                    <Button 
                      onClick={() => duplicateElement(selectedElement.id)}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Duplicate
                    </Button>
                    <Button 
                      onClick={() => deleteElement(selectedElement.id)}
                      variant="destructive"
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Hidden file input for logo upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && selectedElementId) {
                handleLogoUpload(selectedElementId, file);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Component properties panels
function EmailProperties({ element, updateElement }: { element: CanvasElement; updateElement: (id: string, updates: Partial<CanvasElement>) => void }) {
  const tldOptions = ['.com', '.org', '.net', '.io', '.co', '.ai', '.dev', '.app', '.tech', '.design'];

  return (
    <Tabs defaultValue="content" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="content">Content</TabsTrigger>
        <TabsTrigger value="style">Style</TabsTrigger>
      </TabsList>
      <TabsContent value="content" className="space-y-3">
        <div>
          <Label className="text-xs">Local Part (before @)</Label>
          <Input
            value={element.local}
            onChange={(e) => updateElement(element.id, { local: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Domain (used as Instagram handle)</Label>
          <Input
            value={element.domain}
            onChange={(e) => updateElement(element.id, { domain: e.target.value, handle: e.target.value })}
            placeholder="TheOtherMatthewMiller"
          />
        </div>
        <div>
          <Label className="text-xs">TLD</Label>
          <Select
            value={element.tld || '.com'}
            onValueChange={(value) => updateElement(element.id, { tld: value, handle: element.domain })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tldOptions.map(opt => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Name Label</Label>
          <Input
            value={element.labelName}
            onChange={(e) => updateElement(element.id, { labelName: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Site Label</Label>
          <Input
            value={element.labelSite}
            onChange={(e) => updateElement(element.id, { labelSite: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Email Label</Label>
          <Input
            value={element.labelEmail}
            onChange={(e) => updateElement(element.id, { labelEmail: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Instagram Label</Label>
          <Input
            value={element.labelInstagram}
            onChange={(e) => updateElement(element.id, { labelInstagram: e.target.value })}
          />
        </div>
      </TabsContent>
      <TabsContent value="style" className="space-y-3">
        <div>
          <Label className="text-xs">Font Size: {element.fontSize}px (drag resize handle)</Label>
          <Slider
            value={[element.fontSize || 14]}
            onValueChange={([value]) => updateElement(element.id, { fontSize: value })}
            min={8}
            max={36}
            step={1}
          />
        </div>
        <div>
          <Label className="text-xs">Bracket Style</Label>
          <Select
            value={element.bracketStyle}
            onValueChange={(value) => updateElement(element.id, { bracketStyle: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {bracketOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Font Family</Label>
          <Select
            value={element.font}
            onValueChange={(value) => updateElement(element.id, { font: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Font Weight</Label>
          <Select
            value={element.weight}
            onValueChange={(value) => updateElement(element.id, { weight: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {weightOptions.map(opt => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Color</Label>
          <Input
            type="color"
            value={element.color}
            onChange={(e) => updateElement(element.id, { color: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Letter Spacing: {(element.letterSpacing || 0).toFixed(2)}</Label>
          <Slider
            value={[(element.letterSpacing || 0) * 100]}
            onValueChange={([value]) => updateElement(element.id, { letterSpacing: value / 100 })}
            min={-10}
            max={20}
            step={1}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}

function LogoProperties({ element, updateElement, handleLogoUpload, updateLogoCorner }: { 
  element: CanvasElement; 
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  handleLogoUpload: (id: string, file: File) => void;
  updateLogoCorner: (id: string, corner: LogoCorner) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cornerOptions: { value: LogoCorner; label: string }[] = [
    { value: 'top-left', label: 'Top Left' },
    { value: 'top-right', label: 'Top Right' },
    { value: 'bottom-left', label: 'Bottom Left' },
    { value: 'bottom-right', label: 'Bottom Right' }
  ];

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Upload Image</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleLogoUpload(element.id, file);
          }}
          className="mt-1 block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-medium
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100 cursor-pointer"
        />
      </div>
      <div>
        <Label className="text-xs">Corner Position</Label>
        <Select
          value={element.corner || 'top-right'}
          onValueChange={(value: LogoCorner) => updateLogoCorner(element.id, value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {cornerOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Size: {element.size}px (drag resize handle)</Label>
        <Slider
          value={[element.size || 80]}
          onValueChange={([value]) => updateElement(element.id, { size: value })}
          min={20}
          max={300}
          step={5}
        />
      </div>
      <div>
        <Label className="text-xs">Opacity: {Math.round((element.opacity || 1) * 100)}%</Label>
        <Slider
          value={[(element.opacity || 1) * 100]}
          onValueChange={([value]) => updateElement(element.id, { opacity: value / 100 })}
          min={0}
          max={100}
          step={5}
        />
      </div>
    </div>
  );
}
