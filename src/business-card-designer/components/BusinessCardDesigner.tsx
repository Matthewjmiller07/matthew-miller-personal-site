import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Download, RotateCcw, Image, Settings, Palette, Type, QrCode, Loader2, AlertCircle, Plus, Minus, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCw, Link } from 'lucide-react';
import { Textarea } from './ui/textarea';

interface TipItem {
  id: string;
  label: string;
  content: string;
  bold: boolean;
  italic: boolean;
}

interface DesignerState {
  local: string;
  domain: string;
  font: string;
  weight: string;
  fsize: number;
  track: number;
  labelName: string;
  labelSite: string;
  labelEmail: string;
  labelInstagram: string;
  instaHandle: string;
  useInsta: boolean;
  labelDomainBottom: string;
  ink: string;
  bg: string;
  bracket: string;
  // Orientation controls
  frontPortrait: boolean;
  backPortrait: boolean;
  // Front logo settings
  logoFile: File | null;
  logoSize: number;
  logoPosition: string;
  logoPad: number;
  logoHide: boolean;
  logoOpacity: number;
  frontLogoTextSpacing: number; // New: spacing between logo and text area on front
  // Back logo settings
  backLogoFile: File | null;
  backLogoSize: number;
  backLogoPosition: string;
  backLogoPad: number;
  backLogoHide: boolean;
  backLogoOpacity: number;
  useSameLogo: boolean; // New: sync front and back logos
  showBack: boolean;
  qrText: string;
  qrSize: number;
  qrPosition: string;
  qrPad: number;
  qrHide: boolean;
  qrOpacity: number;
  // Enhanced tips system
  tips: TipItem[];
  tipsPosition: string;
  tipsAlignment: string;
  tipsFontSize: number;
  tipsSpacing: number; // New: spacing between items
  showTipLabels: boolean;
  // Manual positioning controls
  tipsOffsetX: number;
  tipsOffsetY: number;
  // Enhanced label controls
  autoNumbering: boolean;
  numberingPrefix: string;
  numberingSuffix: string;
  numberingFormat: string; // "1", "#1", "(1)", etc.
  // Back side typography
  backFont: string;
  backWeight: string;
  backInk: string;
  // Dynamic sizing toggle
  dynamicSizing: boolean;
}

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
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

const positionOptions = [
  { value: 'tl', label: 'Top-left' },
  { value: 'tm', label: 'Top-middle' },
  { value: 'tr', label: 'Top-right' },
  { value: 'ml', label: 'Left-middle' },
  { value: 'mr', label: 'Right-middle' },
  { value: 'bl', label: 'Bottom-left' },
  { value: 'bm', label: 'Bottom-middle' },
  { value: 'br', label: 'Bottom-right' }
];

const tipsPositionOptions = [
  { value: 'center', label: 'Center' },
  { value: 'top', label: 'Top area' },
  { value: 'bottom', label: 'Bottom area' },
  { value: 'left', label: 'Left area' },
  { value: 'right', label: 'Right area' }
];

const alignmentOptions = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
  { value: 'justify', label: 'Justified' }
];

const numberingFormatOptions = [
  { value: '{n}', label: '1, 2, 3...' },
  { value: '#{n}', label: '#1, #2, #3...' },
  { value: '({n})', label: '(1), (2), (3)...' },
  { value: '{n}.', label: '1., 2., 3...', },
  { value: '{n})', label: '1), 2), 3)...' }
];

export default function BusinessCardDesigner() {
  const [state, setState] = useState<DesignerState>({
    local: 'georgia',
    domain: 'Thyme4Sleep.com',
    font: "'Cormorant Garamond', serif",
    weight: '400',
    fsize: 96,
    track: 0.02,
    labelName: 'Name',
    labelSite: 'Site',
    labelEmail: 'Email',
    labelInstagram: 'Instagram',
    instaHandle: 'Thyme4Sleep',
    useInsta: true,
    labelDomainBottom: '',
    ink: '#1A1A1A',
    bg: '#F3EAE3',
    bracket: 'bar',
    // Orientation
    frontPortrait: false,
    backPortrait: false,
    // Front logo
    logoFile: null,
    logoSize: 72,
    logoPosition: 'tl',
    logoPad: 8,
    logoHide: false,
    logoOpacity: 1,
    frontLogoTextSpacing: 40, // Default spacing between logo and text area
    // Back logo
    backLogoFile: null,
    backLogoSize: 72,
    backLogoPosition: 'tl',
    backLogoPad: 8,
    backLogoHide: false,
    backLogoOpacity: 1,
    useSameLogo: true, // Default to using same logo
    showBack: false,
    qrText: 'https://Thyme4Sleep.com',
    qrSize: 120,
    qrPosition: 'tr',
    qrPad: 16,
    qrHide: false,
    qrOpacity: 1,
    // Enhanced tips
    tips: [
      {
        id: '1',
        label: 'Sleep Tip',
        content: 'Expose your child to natural sunlight within an hour of waking in the morning to help set their internal clock.',
        bold: false,
        italic: false
      },
      {
        id: '2',
        label: 'Sleep Tip',
        content: 'Offer a feed at the start of your bedtime routine to minimize a feed-to-sleep association, encouraging independent settling.',
        bold: false,
        italic: false
      }
    ],
    tipsPosition: 'center',
    tipsAlignment: 'left',
    tipsFontSize: 22,
    tipsSpacing: 20, // Default spacing between items
    showTipLabels: true,
    // Manual positioning
    tipsOffsetX: 0,
    tipsOffsetY: 0,
    // Enhanced label controls
    autoNumbering: true,
    numberingPrefix: '',
    numberingSuffix: '. ',
    numberingFormat: '{n}',
    // Back side typography
    backFont: "'Cormorant Garamond', serif",
    backWeight: '400',
    backInk: '#1A1A1A',
    // Dynamic sizing
    dynamicSizing: true
  });

  const svgRef = useRef<SVGSVGElement>(null);
  const [logoHref, setLogoHref] = useState('');
  const [backLogoHref, setBackLogoHref] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [isExporting, setIsExporting] = useState<string>('');

  const updateState = (key: keyof DesignerState, value: any) => {
    setState(prev => ({ ...prev, [key]: value }));
  };

  // Get current dimensions based on orientation
  const getCurrentDimensions = () => {
    const currentPortrait = state.showBack ? state.backPortrait : state.frontPortrait;
    return currentPortrait ? { W: 600, H: 1050 } : { W: 1050, H: 600 };
  };

  const updateTip = (id: string, field: keyof TipItem, value: any) => {
    setState(prev => ({
      ...prev,
      tips: prev.tips.map(tip => 
        tip.id === id ? { ...tip, [field]: value } : tip
      )
    }));
  };

  const addTip = () => {
    const newTip: TipItem = {
      id: Date.now().toString(),
      label: 'Tip',
      content: 'New tip content...',
      bold: false,
      italic: false
    };
    setState(prev => ({
      ...prev,
      tips: [...prev.tips, newTip]
    }));
  };

  const removeTip = (id: string) => {
    setState(prev => ({
      ...prev,
      tips: prev.tips.filter(tip => tip.id !== id)
    }));
  };

  // Manual positioning helpers - work in both dynamic and non-dynamic modes
  const moveText = (direction: 'up' | 'down' | 'left' | 'right') => {
    const step = 10; // pixels
    setState(prev => {
      let newOffsetX = prev.tipsOffsetX;
      let newOffsetY = prev.tipsOffsetY;
      
      switch (direction) {
        case 'up':
          newOffsetY = Math.max(-300, prev.tipsOffsetY - step);
          break;
        case 'down':
          newOffsetY = Math.min(300, prev.tipsOffsetY + step);
          break;
        case 'left':
          newOffsetX = Math.max(-300, prev.tipsOffsetX - step);
          break;
        case 'right':
          newOffsetX = Math.min(300, prev.tipsOffsetX + step);
          break;
      }
      
      return {
        ...prev,
        tipsOffsetX: newOffsetX,
        tipsOffsetY: newOffsetY
      };
    });
  };

  const resetTextPosition = () => {
    setState(prev => ({
      ...prev,
      tipsOffsetX: 0,
      tipsOffsetY: 0
    }));
  };

  // Generate formatted label with numbering
  const getFormattedLabel = (tip: TipItem, index: number): string => {
    if (!state.showTipLabels) return '';
    
    let result = '';
    
    if (state.autoNumbering) {
      const number = (index + 1).toString();
      const numbering = state.numberingFormat.replace('{n}', number);
      result = `${state.numberingPrefix}${numbering}${state.numberingSuffix}`;
    }
    
    if (tip.label.trim()) {
      result += tip.label;
      if (state.autoNumbering && tip.label.trim()) {
        result = `${state.numberingPrefix}${state.numberingFormat.replace('{n}', (index + 1).toString())}${state.numberingSuffix}${tip.label}`;
      }
    }
    
    return result;
  };

  // Collision detection utility functions
  const boundsOverlap = (a: Bounds, b: Bounds): boolean => {
    return !(a.x + a.width < b.x || 
             b.x + b.width < a.x || 
             a.y + a.height < b.y || 
             b.y + b.height < a.y);
  };

  const expandBounds = (bounds: Bounds, padding: number): Bounds => {
    return {
      x: bounds.x - padding,
      y: bounds.y - padding,
      width: bounds.width + padding * 2,
      height: bounds.height + padding * 2
    };
  };

  // Generate QR Code
  const generateQRCode = async (text: string, size: number): Promise<string> => {
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&format=svg`;
      const response = await fetch(qrUrl);
      const svgText = await response.text();
      const dataUrl = `data:image/svg+xml;base64,${btoa(svgText)}`;
      return dataUrl;
    } catch (error) {
      console.error('QR generation failed:', error);
      return '';
    }
  };

  // Update QR code when relevant state changes
  useEffect(() => {
    if (state.qrText && !state.qrHide) {
      generateQRCode(state.qrText, state.qrSize).then(setQrCodeDataUrl);
    } else {
      setQrCodeDataUrl('');
    }
  }, [state.qrText, state.qrSize, state.qrHide]);

  // Sync logos when useSameLogo is enabled
  useEffect(() => {
    if (state.useSameLogo && logoHref && !backLogoHref) {
      setBackLogoHref(logoHref);
    }
  }, [state.useSameLogo, logoHref, backLogoHref]);

  // Helper function to calculate position coordinates
  const getPositionCoords = (position: string, elementSize: number, padding: number, containerW: number, containerH: number) => {
    let x = padding, y = padding;
    
    switch (position) {
      case 'tl': x = padding; y = padding; break;
      case 'tm': x = (containerW - elementSize) / 2; y = padding; break;
      case 'tr': x = containerW - padding - elementSize; y = padding; break;
      case 'ml': x = padding; y = (containerH - elementSize) / 2; break;
      case 'mr': x = containerW - padding - elementSize; y = (containerH - elementSize) / 2; break;
      case 'bl': x = padding; y = containerH - padding - elementSize; break;
      case 'bm': x = (containerW - elementSize) / 2; y = containerH - padding - elementSize; break;
      case 'br': x = containerW - padding - elementSize; y = containerH - padding - elementSize; break;
    }
    
    return { x, y };
  };

  // Calculate text position offset based on logo position and spacing
  const calculateTextPositionOffset = (logoPosition: string, spacing: number, hasLogo: boolean) => {
    if (!hasLogo) return { offsetX: 0, offsetY: 0 };
    
    let offsetX = 0;
    let offsetY = 0;
    
    // Move text away from logo based on logo position
    switch (logoPosition) {
      case 'tl':
      case 'tm':
      case 'tr':
        // Logo is at top, move text down
        offsetY = spacing;
        break;
      case 'bl':
      case 'bm':
      case 'br':
        // Logo is at bottom, move text up
        offsetY = -spacing;
        break;
      case 'ml':
        // Logo is at middle-left, move text right
        offsetX = spacing * 0.7; // Reduce horizontal movement slightly
        break;
      case 'mr':
        // Logo is at middle-right, move text left
        offsetX = -spacing * 0.7; // Reduce horizontal movement slightly
        break;
    }
    
    return { offsetX, offsetY };
  };

  // Enhanced collision-aware text sizing for front side with spacing consideration
  const calculateOptimalFrontSizing = (W: number, H: number, pad: number, logoHref: string) => {
    if (!state.dynamicSizing) {
      return {
        fontSize: state.fsize,
        availableWidth: W - pad * 2,
        availableHeight: H
      };
    }

    // Calculate the actual text area bounds (including labels and brackets)
    let fontSize = state.fsize;
    const avgCharWidth = fontSize * 0.6;
    const totalTextWidth = (state.local.length + 1 + state.domain.length) * avgCharWidth;
    
    // Get text position offset
    const hasLogo = logoHref && !state.logoHide;
    const { offsetX, offsetY } = calculateTextPositionOffset(state.logoPosition, state.frontLogoTextSpacing, hasLogo);
    
    // Text area includes the main text plus space for brackets and labels above/below
    const textAreaHeight = fontSize * 3; // Main text + brackets + labels
    const baseTextY = H / 2 + offsetY;
    const textAreaY = baseTextY - textAreaHeight / 2;
    
    // Text is centered horizontally with offset
    const textAreaX = (W - totalTextWidth) / 2 + offsetX;
    
    const textAreaBounds = {
      x: textAreaX,
      y: textAreaY,
      width: totalTextWidth,
      height: textAreaHeight
    };

    // Check logo collision if present (additional collision detection beyond spacing)
    if (hasLogo) {
      const logoCoords = getPositionCoords(state.logoPosition, state.logoSize, state.logoPad, W, H);
      const logoBounds = {
        x: logoCoords.x,
        y: logoCoords.y,
        width: state.logoSize,
        height: state.logoSize
      };
      
      // Only scale down if there's STILL overlap after spacing offset
      if (boundsOverlap(logoBounds, textAreaBounds)) {
        // Calculate how much we need to scale down to clear the overlap
        const overlapWidth = Math.max(0, Math.min(logoBounds.x + logoBounds.width, textAreaBounds.x + textAreaBounds.width) - Math.max(logoBounds.x, textAreaBounds.x));
        const overlapHeight = Math.max(0, Math.min(logoBounds.y + logoBounds.height, textAreaBounds.y + textAreaBounds.height) - Math.max(logoBounds.y, textAreaBounds.y));
        
        // If there's significant overlap, scale down
        if (overlapWidth > 10 && overlapHeight > 10) {
          fontSize = fontSize * 0.8; // Reduce by 20% without minimum limit
        }
      }
    }
    
    // Also ensure text fits within card bounds
    const maxWidth = W - pad * 2;
    const finalTextWidth = (state.local.length + 1 + state.domain.length) * (fontSize * 0.6);
    if (finalTextWidth > maxWidth) {
      fontSize = fontSize * (maxWidth / finalTextWidth); // Scale to fit without minimum limit
    }

    return {
      fontSize: fontSize,
      availableWidth: W - pad * 2,
      availableHeight: H,
      textOffsetX: offsetX,
      textOffsetY: offsetY
    };
  };

  // Enhanced collision-aware content area calculation for back side - includes manual offsets, works in all modes
  const getTipsArea = (position: string, containerW: number, containerH: number, qrBounds?: Bounds, logoBounds?: Bounds) => {
    const inset = 72;
    let x = inset, y = inset, w = containerW - inset * 2, h = containerH - inset * 2;
    
    if (!state.dynamicSizing) {
      // Apply basic position adjustments without collision detection
      switch (position) {
        case 'top':
          h = Math.min(h, containerH / 3);
          break;
        case 'bottom':
          y = Math.max(y, containerH * 2/3);
          h = containerH - y - inset;
          break;
        case 'left':
          w = Math.min(w, containerW / 2);
          break;
        case 'right':
          x = Math.max(x, containerW / 2);
          w = containerW - x - inset;
          break;
      }
    } else {
      // For collision detection, only adjust positioning for elements that would actually block the content area
      const obstacles: Bounds[] = [];
      
      // Check QR code - only adjust if it's in a position that would actually interfere
      if (qrBounds) {
        const qrPos = state.qrPosition;
        let shouldAdjustForQR = false;
        
        // Only adjust if QR is in a position that would conflict with the content position
        if (position === 'center') {
          // Center content needs to avoid all obstacles that overlap
          shouldAdjustForQR = true;
        } else if (position === 'left' && qrPos.includes('l')) {
          shouldAdjustForQR = true;
        } else if (position === 'right' && qrPos.includes('r')) {
          shouldAdjustForQR = true;
        } else if (position === 'top' && qrPos.includes('t')) {
          shouldAdjustForQR = true;
        } else if (position === 'bottom' && qrPos.includes('b')) {
          shouldAdjustForQR = true;
        }
        
        if (shouldAdjustForQR) {
          obstacles.push(expandBounds(qrBounds, 16));
        }
      }
      
      // Check back logo with same logic
      if (logoBounds) {
        const logoPos = state.backLogoPosition;
        let shouldAdjustForLogo = false;
        
        if (position === 'center') {
          shouldAdjustForLogo = true;
        } else if (position === 'left' && logoPos.includes('l')) {
          shouldAdjustForLogo = true;
        } else if (position === 'right' && logoPos.includes('r')) {
          shouldAdjustForLogo = true;
        } else if (position === 'top' && logoPos.includes('t')) {
          shouldAdjustForLogo = true;
        } else if (position === 'bottom' && logoPos.includes('b')) {
          shouldAdjustForLogo = true;
        }
        
        if (shouldAdjustForLogo) {
          obstacles.push(expandBounds(logoBounds, 16));
        }
      }
      
      // Apply obstacle avoidance - but be smart about it
      obstacles.forEach(obstacle => {
        const contentArea = { x, y, width: w, height: h };
        
        // Only adjust if there's actual overlap
        if (boundsOverlap(obstacle, contentArea)) {
          // Horizontal adjustments - only if obstacle is clearly on one side
          if (obstacle.x + obstacle.width < containerW / 2) {
            // Obstacle is clearly on the left side
            const newX = Math.max(x, obstacle.x + obstacle.width);
            w = Math.max(120, w - (newX - x));
            x = newX;
          } else if (obstacle.x > containerW / 2) {
            // Obstacle is clearly on the right side
            w = Math.max(120, obstacle.x - x);
          }
          
          // Vertical adjustments
          if (obstacle.y + obstacle.height < containerH / 2) {
            // Obstacle is clearly on the top
            const newY = Math.max(y, obstacle.y + obstacle.height);
            h = Math.max(120, h - (newY - y));
            y = newY;
          } else if (obstacle.y > containerH / 2) {
            // Obstacle is clearly on the bottom
            h = Math.max(120, obstacle.y - y);
          }
        }
      });
      
      // Apply position preferences after collision adjustments
      switch (position) {
        case 'top':
          h = Math.min(h, containerH / 3);
          break;
        case 'bottom':
          const newY = Math.max(y, containerH * 2/3);
          h = Math.max(h - (newY - y), containerH / 3);
          y = newY;
          break;
        case 'left':
          w = Math.min(w, containerW / 2);
          break;
        case 'right':
          const newX = Math.max(x, containerW / 2);
          w = Math.max(w - (newX - x), containerW / 3);
          x = newX;
          break;
      }
    }
    
    // Apply manual offsets - works in BOTH dynamic and non-dynamic modes
    x += state.tipsOffsetX;
    y += state.tipsOffsetY;
    
    // Ensure content stays within card bounds
    x = Math.max(inset, Math.min(x, containerW - w - inset));
    y = Math.max(inset, Math.min(y, containerH - h - inset));
    
    return { x, y, w, h };
  };

  // Calculate optimal font size for content based on available area - keeping reasonable minimum for back side content
  const calculateOptimalContentFontSize = (contentArea: {x: number, y: number, w: number, h: number}, tips: TipItem[]): number => {
    if (tips.length === 0 || !state.dynamicSizing) return state.tipsFontSize;
    
    // Estimate total content height needed
    const avgCharsPerLine = Math.floor(contentArea.w / (state.tipsFontSize * 0.6));
    let totalLines = 0;
    
    tips.forEach((tip, index) => {
      const formattedLabel = getFormattedLabel(tip, index);
      if (formattedLabel) {
        totalLines += Math.ceil(formattedLabel.length / avgCharsPerLine) + 0.5; // Label + gap
      }
      totalLines += Math.ceil(tip.content.length / avgCharsPerLine) + 1; // Content + spacing
    });
    
    const lineHeight = state.tipsFontSize * 1.4;
    const neededHeight = totalLines * lineHeight + 60; // Extra padding
    
    // Scale down font if content doesn't fit - keep reasonable minimum for readability
    if (neededHeight > contentArea.h) {
      const scaleFactor = contentArea.h / neededHeight;
      return Math.max(8, Math.floor(state.tipsFontSize * scaleFactor)); // Minimum 8px instead of 12px
    }
    
    return state.tipsFontSize;
  };

  // Shared bracket and label rendering function for both preview and export
  const renderBracketsAndLabels = (svg: SVGSVGElement, fontSize: number, y: number, W: number, H: number, textPositions: {localX: number, localX2: number, domainX: number, domainX2: number}) => {
    const NS = "http://www.w3.org/2000/svg";
    
    const guidesGroup = document.createElementNS(NS, 'g');
    svg.appendChild(guidesGroup);
    
    const labelGap = 16;
    const lineOffset = 22;
    const cap = 14;
    const tick = 10;
    
    const groupTop = y - fontSize * 0.5;
    const groupBot = y + fontSize * 0.5;
    const topY = groupTop - lineOffset;
    const bottomY = groupBot + lineOffset;
    const bottomY2 = bottomY + 36;
    
    const line = (x1: number, y1: number, x2: number, y2: number) => {
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', x1.toString());
      l.setAttribute('y1', y1.toString());
      l.setAttribute('x2', x2.toString());
      l.setAttribute('y2', y2.toString());
      l.setAttribute('stroke', state.ink);
      l.setAttribute('stroke-width', '2');
      guidesGroup.appendChild(l);
    };
    
    const brace = (x1: number, x2: number, y: number, isTop: boolean) => {
      const dirToLabel = isTop ? 1 : -1;
      const h = 22, wC = 20;
      const path = document.createElementNS(NS, 'path');
      const d = `
        M ${x1} ${y} c 0 ${dirToLabel*h/2}, ${-wC} ${dirToLabel*h/2}, ${-wC} ${dirToLabel*h}
        m 0 ${-dirToLabel*h} c 0 ${-dirToLabel*h/2}, ${wC} ${-dirToLabel*h/2}, ${wC} ${-dirToLabel*h}
        M ${x2} ${y} c 0 ${dirToLabel*h/2}, ${wC} ${dirToLabel*h/2}, ${wC} ${dirToLabel*h}
        m 0 ${-dirToLabel*h} c 0 ${-dirToLabel*h/2}, ${-wC} ${-dirToLabel*h/2}, ${-wC} ${-dirToLabel*h}
        M ${x1} ${y} L ${x2} ${y}
      `;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', state.ink);
      path.setAttribute('stroke-width', '2');
      guidesGroup.appendChild(path);
    };
    
    const underline = (x1: number, x2: number, y: number, isTop: boolean) => {
      const offset = 14 * (isTop ? 1 : -1);
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', `M ${x1} ${y+offset} L ${x2} ${y+offset}`);
      path.setAttribute('stroke', state.ink);
      path.setAttribute('stroke-width', '2');
      path.setAttribute('fill', 'none');
      guidesGroup.appendChild(path);
    };
    
    const drawBracket = (x1: number, x2: number, y: number, labelText: string, isTop: boolean) => {
      if (state.bracket !== 'none') {
        if (state.bracket === 'bar') {
          line(x1, y, x2, y);
          line(x1, y, x1, y + (isTop ? cap : -cap));
          line(x2, y, x2, y + (isTop ? cap : -cap));
          line((x1+x2)/2, y, (x1+x2)/2, y + (isTop ? -tick : tick));
        } else if (state.bracket === 'brace') {
          brace(x1, x2, y, isTop);
          line((x1+x2)/2, y, (x1+x2)/2, y + (isTop ? -tick : tick));
        } else if (state.bracket === 'underline') {
          underline(x1, x2, y, isTop);
          line((x1+x2)/2, y + (isTop ? -14 : 14), (x1+x2)/2, y + (isTop ? -(14+tick) : (14+tick)));
        }
      }
      
      const label = document.createElementNS(NS, 'text');
      label.setAttribute('x', ((x1 + x2) / 2).toString());
      label.setAttribute('y', (isTop ? y - labelGap - 6 : y + labelGap + 6).toString());
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', Math.max(18, Math.min(26, fontSize * 0.27)).toString());
      label.setAttribute('font-family', "'Cormorant Garamond', serif");
      label.setAttribute('fill', state.ink);
      label.textContent = labelText;
      svg.appendChild(label);
    };
    
    // Use the passed text positions for bracket calculations
    const { localX, localX2, domainX, domainX2 } = textPositions;
    
    drawBracket(localX, localX2, topY, state.labelName, true);
    drawBracket(domainX, domainX2, topY, state.labelSite, true);
    
    // Fixed Instagram bracket calculation - should only cover @ + handle, not extend into domain
    const handlePart = state.instaHandle.replace(/^@+/, '') || state.domain.split('.')[0] || '';
    const avgCharWidth = fontSize * 0.6;
    const handleWidth = handlePart.length * avgCharWidth;
    
    // Instagram bracket starts at @ symbol and ends after the handle
    const atX = localX + (state.local.length * avgCharWidth); // Position of @ symbol
    const instaX2 = atX + avgCharWidth + handleWidth; // @ symbol + handle width
    drawBracket(atX, instaX2, bottomY, state.labelInstagram, false);
    drawBracket(localX, domainX2, bottomY2, state.labelEmail, false);
  };

  // Shared rendering logic to ensure preview matches export exactly
  const renderCardContent = (svg: SVGSVGElement, isExport: boolean = false) => {
    const NS = "http://www.w3.org/2000/svg";
    const XLINK = 'http://www.w3.org/1999/xlink';
    
    const { W, H } = getCurrentDimensions();
    const pad = 60;
    
    // Background
    const bgRect = document.createElementNS(NS, 'rect');
    bgRect.setAttribute('x', '0');
    bgRect.setAttribute('y', '0');
    bgRect.setAttribute('width', W.toString());
    bgRect.setAttribute('height', H.toString());
    bgRect.setAttribute('rx', '16');
    bgRect.setAttribute('fill', state.bg);
    svg.appendChild(bgRect);

    if (state.showBack) {
      // Back side rendering with collision detection
      let qrBounds, logoBounds;
      
      // QR Code
      if (qrCodeDataUrl && !state.qrHide) {
        const qrCoords = getPositionCoords(state.qrPosition, state.qrSize, state.qrPad, W, H);
        qrBounds = { x: qrCoords.x, y: qrCoords.y, width: state.qrSize, height: state.qrSize };
        
        const qrImg = document.createElementNS(NS, 'image');
        qrImg.setAttribute('x', qrCoords.x.toString());
        qrImg.setAttribute('y', qrCoords.y.toString());
        qrImg.setAttribute('width', state.qrSize.toString());
        qrImg.setAttribute('height', state.qrSize.toString());
        qrImg.setAttribute('opacity', state.qrOpacity.toString());
        qrImg.setAttribute('href', qrCodeDataUrl);
        qrImg.setAttributeNS(XLINK, 'xlink:href', qrCodeDataUrl);
        svg.appendChild(qrImg);
      }
      
      // Back Logo - use front logo if useSameLogo is enabled and no back logo
      const currentBackLogoHref = state.useSameLogo && !state.backLogoFile ? logoHref : backLogoHref;
      if (currentBackLogoHref && !state.backLogoHide) {
        const logoCoords = getPositionCoords(state.backLogoPosition, state.backLogoSize, state.backLogoPad, W, H);
        logoBounds = { x: logoCoords.x, y: logoCoords.y, width: state.backLogoSize, height: state.backLogoSize };
        
        const logoImg = document.createElementNS(NS, 'image');
        logoImg.setAttribute('x', logoCoords.x.toString());
        logoImg.setAttribute('y', logoCoords.y.toString());
        logoImg.setAttribute('width', state.backLogoSize.toString());
        logoImg.setAttribute('height', state.backLogoSize.toString());
        logoImg.setAttribute('opacity', state.backLogoOpacity.toString());
        logoImg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        logoImg.setAttribute('href', currentBackLogoHref);
        logoImg.setAttributeNS(XLINK, 'xlink:href', currentBackLogoHref);
        svg.appendChild(logoImg);
      }
      
      // Tips with collision-aware sizing and manual positioning
      if (state.tips.length > 0) {
        const tipsArea = getTipsArea(state.tipsPosition, W, H, qrBounds, logoBounds);
        const optimalFontSize = calculateOptimalContentFontSize(tipsArea, state.tips);
        
        if (isExport) {
          // SVG text export rendering
          const wrapText = (text: string, maxWidth: number): string[] => {
            const words = text.split(' ');
            const lines: string[] = [];
            let currentLine = '';
            const avgCharWidth = optimalFontSize * 0.6;
            
            for (const word of words) {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              const estimatedWidth = testLine.length * avgCharWidth;
              
              if (estimatedWidth <= maxWidth) {
                currentLine = testLine;
              } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
              }
            }
            if (currentLine) lines.push(currentLine);
            return lines;
          };
          
          const lineHeight = optimalFontSize * 1.4;
          let currentY = tipsArea.y + 30;
          
          state.tips.forEach((tip, index) => {
            if (index > 0) currentY += state.tipsSpacing; // Use custom spacing
            
            // Tip label
            const formattedLabel = getFormattedLabel(tip, index);
            if (formattedLabel) {
              const labelText = document.createElementNS(NS, 'text');
              labelText.setAttribute('y', currentY.toString());
              labelText.setAttribute('font-family', state.backFont);
              labelText.setAttribute('font-weight', '600');
              labelText.setAttribute('font-size', (optimalFontSize + 2).toString());
              labelText.setAttribute('fill', state.backInk);
              labelText.textContent = formattedLabel;
              
              if (state.tipsAlignment === 'center') {
                labelText.setAttribute('x', (tipsArea.x + tipsArea.w / 2).toString());
                labelText.setAttribute('text-anchor', 'middle');
              } else if (state.tipsAlignment === 'right') {
                labelText.setAttribute('x', (tipsArea.x + tipsArea.w).toString());
                labelText.setAttribute('text-anchor', 'end');
              } else {
                labelText.setAttribute('x', tipsArea.x.toString());
                labelText.setAttribute('text-anchor', 'start');
              }
              
              if (currentY >= 0 && currentY <= H) {
                svg.appendChild(labelText);
              }
              currentY += lineHeight;
            }
            
            // Tip content
            const contentLines = wrapText(tip.content, tipsArea.w);
            contentLines.forEach((line, lineIndex) => {
              const textY = currentY + lineIndex * lineHeight;
              
              if (textY >= 0 && textY <= H) {
                const textEl = document.createElementNS(NS, 'text');
                textEl.setAttribute('y', textY.toString());
                textEl.setAttribute('font-family', state.backFont);
                textEl.setAttribute('font-weight', tip.bold ? '600' : state.backWeight);
                textEl.setAttribute('font-style', tip.italic ? 'italic' : 'normal');
                textEl.setAttribute('font-size', optimalFontSize.toString());
                textEl.setAttribute('fill', state.backInk);
                textEl.textContent = line;
                
                if (state.tipsAlignment === 'center') {
                  textEl.setAttribute('x', (tipsArea.x + tipsArea.w / 2).toString());
                  textEl.setAttribute('text-anchor', 'middle');
                } else if (state.tipsAlignment === 'right') {
                  textEl.setAttribute('x', (tipsArea.x + tipsArea.w).toString());
                  textEl.setAttribute('text-anchor', 'end');
                } else {
                  textEl.setAttribute('x', tipsArea.x.toString());
                  textEl.setAttribute('text-anchor', 'start');
                }
                
                svg.appendChild(textEl);
              }
            });
            
            currentY += contentLines.length * lineHeight;
          });
        } else {
          // ForeignObject preview rendering
          const tipFO = document.createElementNS(NS, 'foreignObject');
          tipFO.setAttribute('x', tipsArea.x.toString());
          tipFO.setAttribute('y', tipsArea.y.toString());
          tipFO.setAttribute('width', tipsArea.w.toString());
          tipFO.setAttribute('height', tipsArea.h.toString());
          
          const tipDiv = document.createElement('div');
          tipDiv.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
          tipDiv.style.display = 'flex';
          tipDiv.style.flexDirection = 'column';
          tipDiv.style.gap = `${state.tipsSpacing}px`; // Use custom spacing
          tipDiv.style.color = state.backInk;
          tipDiv.style.fontFamily = state.backFont;
          tipDiv.style.fontWeight = state.backWeight;
          tipDiv.style.fontSize = `${optimalFontSize}px`;
          tipDiv.style.lineHeight = '1.4';
          tipDiv.style.textAlign = state.tipsAlignment === 'justify' ? 'justify' : state.tipsAlignment;
          
          state.tips.forEach((tip, index) => {
            const tipContainer = document.createElement('div');
            tipContainer.style.marginBottom = '10px';
            
            const formattedLabel = getFormattedLabel(tip, index);
            if (formattedLabel) {
              const labelEl = document.createElement('div');
              labelEl.style.fontWeight = '600';
              labelEl.style.fontSize = `${optimalFontSize + 2}px`;
              labelEl.style.marginBottom = '4px';
              labelEl.textContent = formattedLabel;
              tipContainer.appendChild(labelEl);
            }
            
            const contentEl = document.createElement('div');
            contentEl.style.fontWeight = tip.bold ? '600' : state.backWeight;
            contentEl.style.fontStyle = tip.italic ? 'italic' : 'normal';
            contentEl.textContent = tip.content;
            tipContainer.appendChild(contentEl);
            
            tipDiv.appendChild(tipContainer);
          });
          
          tipFO.appendChild(tipDiv);
          svg.appendChild(tipFO);
        }
      }
      
    } else {
      // Front side rendering with logo-to-text spacing
      const sizing = calculateOptimalFrontSizing(W, H, pad, logoHref);
      const fontSize = sizing.fontSize;
      
      const emailGroup = document.createElementNS(NS, 'g');
      
      const tLocal = document.createElementNS(NS, 'text');
      const tAt = document.createElementNS(NS, 'text');
      const tDomain = document.createElementNS(NS, 'text');
      
      [tLocal, tAt, tDomain].forEach(t => {
        t.setAttribute('dominant-baseline', 'middle');
        t.setAttribute('text-anchor', 'start');
        t.setAttribute('font-family', state.font);
        t.setAttribute('font-weight', state.weight);
        t.setAttribute('fill', state.ink);
        t.setAttribute('letter-spacing', `${state.track}em`);
        t.setAttribute('font-size', fontSize.toString());
        emailGroup.appendChild(t);
      });
      
      tLocal.textContent = state.local;
      tAt.textContent = '@';
      tDomain.textContent = state.domain;
      
      // Apply text position offset based on logo position and spacing
      const baseY = H / 2;
      const y = baseY + (sizing.textOffsetY || 0);
      
      // Calculate positions for both preview and export
      const avgCharWidth = fontSize * 0.6;
      const localWidth = state.local.length * avgCharWidth;
      const atWidth = avgCharWidth;
      const domainWidth = state.domain.length * avgCharWidth;
      const totalTextWidth = localWidth + atWidth + domainWidth;
      
      const baseStartX = (W - totalTextWidth) / 2;
      const startX = baseStartX + (sizing.textOffsetX || 0);
      let x = startX;
      
      // Set text positions
      tLocal.setAttribute('x', x.toString());
      tLocal.setAttribute('y', y.toString());
      const localX = x;
      const localX2 = x + localWidth;
      x += localWidth;
      
      tAt.setAttribute('x', x.toString());
      tAt.setAttribute('y', y.toString());
      x += atWidth;
      
      tDomain.setAttribute('x', x.toString());
      tDomain.setAttribute('y', y.toString());
      const domainX = x;
      const domainX2 = x + domainWidth;
      
      svg.appendChild(emailGroup);
      
      // Add brackets and labels for BOTH preview and export with correct positions
      const textPositions = { localX, localX2, domainX, domainX2 };
      renderBracketsAndLabels(svg, fontSize, y, W, H, textPositions);
      
      // Front Logo
      if (logoHref && !state.logoHide) {
        const logoCoords = getPositionCoords(state.logoPosition, state.logoSize, state.logoPad, W, H);
        
        const logoImg = document.createElementNS(NS, 'image');
        logoImg.setAttribute('x', logoCoords.x.toString());
        logoImg.setAttribute('y', logoCoords.y.toString());
        logoImg.setAttribute('width', state.logoSize.toString());
        logoImg.setAttribute('height', state.logoSize.toString());
        logoImg.setAttribute('opacity', state.logoOpacity.toString());
        logoImg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        logoImg.setAttribute('href', logoHref);
        logoImg.setAttributeNS(XLINK, 'xlink:href', logoHref);
        svg.appendChild(logoImg);
      }
    }
  };

  // Create export-ready SVG with collision detection and transparency
  const createExportSVG = (): string => {
    const NS = "http://www.w3.org/2000/svg";
    const XLINK = 'http://www.w3.org/1999/xlink';
    
    const { W, H } = getCurrentDimensions();
    
    const exportSvg = document.createElementNS(NS, 'svg');
    exportSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    exportSvg.setAttribute('width', W.toString());
    exportSvg.setAttribute('height', H.toString());
    exportSvg.setAttribute('xmlns', NS);
    exportSvg.setAttribute('xmlns:xlink', XLINK);
    exportSvg.style.overflow = 'hidden';
    
    const defs = document.createElementNS(NS, 'defs');
    const style = document.createElementNS(NS, 'style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@200;300;400;500;600;700&family=EB+Garamond:wght@400;500;600;700&family=Lora:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@200;300;400;500;600;700&display=swap');
      text { text-rendering: geometricPrecision; font-kerning: normal; }
    `;
    defs.appendChild(style);
    exportSvg.appendChild(defs);
    
    // Use shared rendering logic
    renderCardContent(exportSvg, true);
    
    return new XMLSerializer().serializeToString(exportSvg);
  };

  // Preview rendering function with collision detection and transparency
  const renderBusinessCard = () => {
    if (!svgRef.current) return;
    
    const svg = svgRef.current;
    svg.innerHTML = '';
    
    const { W, H } = getCurrentDimensions();
    
    // Update SVG viewBox for current orientation
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    
    // Use shared rendering logic
    renderCardContent(svg, false);
  };

  useEffect(() => {
    renderBusinessCard();
  }, [state, logoHref, backLogoHref, qrCodeDataUrl]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateState('logoFile', file);
      const reader = new FileReader();
      reader.onload = () => {
        const logoUrl = reader.result as string;
        setLogoHref(logoUrl);
        
        // Auto-sync to back logo if useSameLogo is enabled and no back logo exists
        if (state.useSameLogo && !state.backLogoFile) {
          setBackLogoHref(logoUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateState('backLogoFile', file);
      const reader = new FileReader();
      reader.onload = () => {
        setBackLogoHref(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportSVG = async () => {
    try {
      setIsExporting('svg');
      const exportSvgString = createExportSVG();
      downloadFile(exportSvgString, 'business-card.svg', 'image/svg+xml');
    } catch (error) {
      console.error('SVG export failed:', error);
      alert('SVG export failed. Please try again.');
    } finally {
      setIsExporting('');
    }
  };

  const handlePNGExport = (scale: number) => {
    const dpi = scale === 2 ? '600' : '300';
    alert(`PNG export is not available in this environment due to security restrictions. Please use the SVG export and convert it to PNG using external tools like:\n\n• Online converters (CloudConvert, Convertio)\n• Design software (Figma, Adobe Illustrator)\n• Browser dev tools\n\nThe SVG file will work perfectly for high-quality printing at ${dpi} DPI.`);
  };

  // Get current aspect ratio for preview container
  const getCurrentAspectRatio = () => {
    const currentPortrait = state.showBack ? state.backPortrait : state.frontPortrait;
    return currentPortrait ? 'aspect-[4/7]' : 'aspect-[7/4]';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold text-slate-900">Business Card Designer</h1>
          <p className="text-slate-600">Create beautiful, professional business cards with live preview</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Control Panel */}
          <div className="xl:col-span-2 space-y-6">
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm">
                <TabsTrigger value="content" className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Content
                </TabsTrigger>
                <TabsTrigger value="style" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Style
                </TabsTrigger>
                <TabsTrigger value="assets" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Assets
                </TabsTrigger>
                <TabsTrigger value="back" className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  Back Side
                </TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Type className="h-5 w-5" />
                      Email Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="local">Local part (before @)</Label>
                      <Input
                        id="local"
                        value={state.local}
                        onChange={(e) => updateState('local', e.target.value)}
                        placeholder="georgia"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="domain">Domain (after @)</Label>
                      <Input
                        id="domain"
                        value={state.domain}
                        onChange={(e) => updateState('domain', e.target.value)}
                        placeholder="Thyme4Sleep.com"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Labels & Text</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="labelName">Name Label</Label>
                      <Input
                        id="labelName"
                        value={state.labelName}
                        onChange={(e) => updateState('labelName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="labelSite">Site Label</Label>
                      <Input
                        id="labelSite"
                        value={state.labelSite}
                        onChange={(e) => updateState('labelSite', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="labelEmail">Email Label</Label>
                      <Input
                        id="labelEmail"
                        value={state.labelEmail}
                        onChange={(e) => updateState('labelEmail', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="labelInstagram">Instagram Label</Label>
                      <Input
                        id="labelInstagram"
                        value={state.labelInstagram}
                        onChange={(e) => updateState('labelInstagram', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="instaHandle">Instagram Handle</Label>
                      <Input
                        id="instaHandle"
                        value={state.instaHandle}
                        onChange={(e) => updateState('instaHandle', e.target.value)}
                        placeholder="Thyme4Sleep"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="style" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Orientation & Layout Options</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-green-50 border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="frontPortrait"
                          checked={state.frontPortrait}
                          onCheckedChange={(checked) => updateState('frontPortrait', checked)}
                        />
                        <Label htmlFor="frontPortrait" className="flex items-center gap-2">
                          <RotateCw className="h-4 w-4" />
                          Front Portrait Mode
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="backPortrait"
                          checked={state.backPortrait}
                          onCheckedChange={(checked) => updateState('backPortrait', checked)}
                        />
                        <Label htmlFor="backPortrait" className="flex items-center gap-2">
                          <RotateCw className="h-4 w-4" />
                          Back Portrait Mode
                        </Label>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="dynamicSizing"
                        checked={state.dynamicSizing}
                        onCheckedChange={(checked) => updateState('dynamicSizing', checked)}
                      />
                      <Label htmlFor="dynamicSizing">Smart Collision Detection</Label>
                      <span className="text-sm text-gray-500 ml-2">
                        Automatically resize text to avoid overlapping with logos and QR codes
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Front Side Typography</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="font">Font Family</Label>
                      <Select value={state.font} onValueChange={(value) => updateState('font', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fontOptions.map(font => (
                            <SelectItem key={font.value} value={font.value}>
                              {font.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weight">Font Weight</Label>
                      <Select value={state.weight} onValueChange={(value) => updateState('weight', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {weightOptions.map(weight => (
                            <SelectItem key={weight} value={weight}>
                              {weight}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bracket">Bracket Style</Label>
                      <Select value={state.bracket} onValueChange={(value) => updateState('bracket', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {bracketOptions.map(bracket => (
                            <SelectItem key={bracket.value} value={bracket.value}>
                              {bracket.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fsize">Base Font Size (px)</Label>
                      <Input
                        id="fsize"
                        type="number"
                        min="8"
                        max="300"
                        value={state.fsize}
                        onChange={(e) => updateState('fsize', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="track">Letter Spacing (em)</Label>
                      <Input
                        id="track"
                        type="number"
                        step="0.01"
                        value={state.track}
                        onChange={(e) => updateState('track', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ink">Text Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="ink"
                          type="color"
                          value={state.ink}
                          onChange={(e) => updateState('ink', e.target.value)}
                          className="w-16 h-10 p-1 border rounded"
                        />
                        <Input
                          value={state.ink}
                          onChange={(e) => updateState('ink', e.target.value)}
                          placeholder="#1A1A1A"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Front Side Layout Spacing Control */}
                <Card>
                  <CardHeader>
                    <CardTitle>Front Side Layout Spacing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 p-4 bg-orange-50 border-orange-200 rounded-lg">
                      <Label htmlFor="frontLogoTextSpacing">Logo to Text Spacing: {state.frontLogoTextSpacing}px</Label>
                      <Slider
                        id="frontLogoTextSpacing"
                        min={10}
                        max={100}
                        step={5}
                        value={[state.frontLogoTextSpacing]}
                        onValueChange={(value) => updateState('frontLogoTextSpacing', value[0])}
                        className="w-full"
                      />
                      <p className="text-xs text-orange-700">
                        Adjust the distance between the logo and text/label area on the front side
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Back Side Typography</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="backFont">Back Font Family</Label>
                      <Select value={state.backFont} onValueChange={(value) => updateState('backFont', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fontOptions.map(font => (
                            <SelectItem key={font.value} value={font.value}>
                              {font.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="backWeight">Back Font Weight</Label>
                      <Select value={state.backWeight} onValueChange={(value) => updateState('backWeight', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {weightOptions.map(weight => (
                            <SelectItem key={weight} value={weight}>
                              {weight}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="backInk">Back Text Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="backInk"
                          type="color"
                          value={state.backInk}
                          onChange={(e) => updateState('backInk', e.target.value)}
                          className="w-16 h-10 p-1 border rounded"
                        />
                        <Input
                          value={state.backInk}
                          onChange={(e) => updateState('backInk', e.target.value)}
                          placeholder="#1A1A1A"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Colors</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bg">Background Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="bg"
                          type="color"
                          value={state.bg}
                          onChange={(e) => updateState('bg', e.target.value)}
                          className="w-16 h-10 p-1 border rounded"
                        />
                        <Input
                          value={state.bg}
                          onChange={(e) => updateState('bg', e.target.value)}
                          placeholder="#F3EAE3"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="assets" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Image className="h-5 w-5" />
                      Logo Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Logo Sync Control */}
                    <div className="p-4 bg-blue-50 border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2 mb-3">
                        <Switch
                          id="useSameLogo"
                          checked={state.useSameLogo}
                          onCheckedChange={(checked) => {
                            updateState('useSameLogo', checked);
                            // If enabling sync and front logo exists, copy to back
                            if (checked && logoHref && !state.backLogoFile) {
                              setBackLogoHref(logoHref);
                            }
                          }}
                        />
                        <Label htmlFor="useSameLogo" className="flex items-center gap-2">
                          <Link className="h-4 w-4" />
                          Use Same Logo on Both Sides
                        </Label>
                      </div>
                      <p className="text-sm text-blue-700">
                        {state.useSameLogo 
                          ? 'The front logo will be used on both sides. Upload a different back logo below to override.'
                          : 'Use different logos for front and back sides.'
                        }
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="logoFile">Front Logo File</Label>
                        <Input
                          id="logoFile"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="logoPosition">Front Logo Position</Label>
                        <Select value={state.logoPosition} onValueChange={(value) => updateState('logoPosition', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {positionOptions.map(position => (
                              <SelectItem key={position.value} value={position.value}>
                                {position.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="logoSize">Front Logo Size (px)</Label>
                        <Input
                          id="logoSize"
                          type="number"
                          min="12"
                          max="400"
                          value={state.logoSize}
                          onChange={(e) => updateState('logoSize', parseInt(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="logoPad">Front Logo Padding (px)</Label>
                        <Input
                          id="logoPad"
                          type="number"
                          min="0"
                          max="120"
                          value={state.logoPad}
                          onChange={(e) => updateState('logoPad', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="logoOpacity">Front Logo Transparency: {Math.round((1 - state.logoOpacity) * 100)}%</Label>
                        <Slider
                          id="logoOpacity"
                          min={0}
                          max={1}
                          step={0.1}
                          value={[state.logoOpacity]}
                          onValueChange={(value) => updateState('logoOpacity', value[0])}
                          className="w-full"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="logoHide"
                          checked={state.logoHide}
                          onCheckedChange={(checked) => updateState('logoHide', checked)}
                        />
                        <Label htmlFor="logoHide">Hide Front Logo</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="back" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <QrCode className="h-5 w-5" />
                      QR Code Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="qrText">QR Code URL/Text</Label>
                        <Input
                          id="qrText"
                          value={state.qrText}
                          onChange={(e) => updateState('qrText', e.target.value)}
                          placeholder="https://Thyme4Sleep.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="qrSize">QR Size (px)</Label>
                        <Input
                          id="qrSize"
                          type="number"
                          min="24"
                          max="400"
                          value={state.qrSize}
                          onChange={(e) => updateState('qrSize', parseInt(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="qrPosition">QR Position</Label>
                        <Select value={state.qrPosition} onValueChange={(value) => updateState('qrPosition', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {positionOptions.map(position => (
                              <SelectItem key={position.value} value={position.value}>
                                {position.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="qrPad">QR Padding (px)</Label>
                        <Input
                          id="qrPad"
                          type="number"
                          min="0"
                          max="120"
                          value={state.qrPad}
                          onChange={(e) => updateState('qrPad', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="qrOpacity">QR Code Transparency: {Math.round((1 - state.qrOpacity) * 100)}%</Label>
                        <Slider
                          id="qrOpacity"
                          min={0}
                          max={1}
                          step={0.1}
                          value={[state.qrOpacity]}
                          onValueChange={(value) => updateState('qrOpacity', value[0])}
                          className="w-full"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="qrHide"
                          checked={state.qrHide}
                          onCheckedChange={(checked) => updateState('qrHide', checked)}
                        />
                        <Label htmlFor="qrHide">Hide QR Code</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Image className="h-5 w-5" />
                      Back Logo Settings
                      {state.useSameLogo && (
                        <Badge variant="secondary" className="text-xs">
                          Using Front Logo
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="backLogoFile">
                          {state.useSameLogo ? 'Override Logo File (Optional)' : 'Back Logo File'}
                        </Label>
                        <Input
                          id="backLogoFile"
                          type="file"
                          accept="image/*"
                          onChange={handleBackLogoUpload}
                        />
                        {state.useSameLogo && (
                          <p className="text-xs text-gray-600">
                            Upload to use a different logo on the back side
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="backLogoPosition">Back Logo Position</Label>
                        <Select value={state.backLogoPosition} onValueChange={(value) => updateState('backLogoPosition', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {positionOptions.map(position => (
                              <SelectItem key={position.value} value={position.value}>
                                {position.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="backLogoSize">Back Logo Size (px)</Label>
                        <Input
                          id="backLogoSize"
                          type="number"
                          min="12"
                          max="400"
                          value={state.backLogoSize}
                          onChange={(e) => updateState('backLogoSize', parseInt(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="backLogoPad">Back Logo Padding (px)</Label>
                        <Input
                          id="backLogoPad"
                          type="number"
                          min="0"
                          max="120"
                          value={state.backLogoPad}
                          onChange={(e) => updateState('backLogoPad', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="backLogoOpacity">Back Logo Transparency: {Math.round((1 - state.backLogoOpacity) * 100)}%</Label>
                        <Slider
                          id="backLogoOpacity"
                          min={0}
                          max={1}
                          step={0.1}
                          value={[state.backLogoOpacity]}
                          onValueChange={(value) => updateState('backLogoOpacity', value[0])}
                          className="w-full"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="backLogoHide"
                          checked={state.backLogoHide}
                          onCheckedChange={(checked) => updateState('backLogoHide', checked)}
                        />
                        <Label htmlFor="backLogoHide">Hide Back Logo</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Content Items</span>
                      <div className="flex gap-2">
                        <Button
                          onClick={addTip}
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          <Plus className="h-4 w-4" />
                          Add Item
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="tipsPosition">Content Position</Label>
                        <Select value={state.tipsPosition} onValueChange={(value) => updateState('tipsPosition', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {tipsPositionOptions.map(pos => (
                              <SelectItem key={pos.value} value={pos.value}>
                                {pos.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tipsAlignment">Text Alignment</Label>
                        <Select value={state.tipsAlignment} onValueChange={(value) => updateState('tipsAlignment', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {alignmentOptions.map(align => (
                              <SelectItem key={align.value} value={align.value}>
                                {align.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tipsFontSize">Font Size (px)</Label>
                        <Input
                          id="tipsFontSize"
                          type="number"
                          min="8"
                          max="72"
                          value={state.tipsFontSize}
                          onChange={(e) => updateState('tipsFontSize', parseInt(e.target.value))}
                        />
                      </div>
                    </div>

                    {/* Item Spacing Control */}
                    <div className="space-y-2 p-4 bg-purple-50 border-purple-200 rounded-lg">
                      <Label htmlFor="tipsSpacing">Space Between Items: {state.tipsSpacing}px</Label>
                      <Slider
                        id="tipsSpacing"
                        min={5}
                        max={60}
                        step={5}
                        value={[state.tipsSpacing]}
                        onValueChange={(value) => updateState('tipsSpacing', value[0])}
                        className="w-full"
                      />
                      <p className="text-xs text-purple-700">
                        Adjust the vertical spacing between content items
                      </p>
                    </div>

                    {/* Manual Text Positioning Controls - Works in ALL modes */}
                    <Card className="bg-blue-50 border-blue-200">
                      <CardHeader>
                        <CardTitle className="text-blue-800 flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Manual Text Positioning
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Works in all modes
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-sm text-blue-700 mb-3">
                          Fine-tune the position of your content text. Works with both Smart Collision Detection on or off.
                        </div>
                        
                        <div className="flex flex-col items-center space-y-3">
                          {/* Up Arrow */}
                          <Button
                            onClick={() => moveText('up')}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          
                          {/* Left and Right Arrows */}
                          <div className="flex items-center space-x-8">
                            <Button
                              onClick={() => moveText('left')}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1"
                            >
                              <ArrowLeft className="h-4 w-4" />
                            </Button>
                            
                            <div className="flex flex-col items-center space-y-1">
                              <div className="text-xs text-gray-600">Offset:</div>
                              <div className="text-sm font-mono">
                                X: {state.tipsOffsetX}px
                              </div>
                              <div className="text-sm font-mono">
                                Y: {state.tipsOffsetY}px
                              </div>
                            </div>
                            
                            <Button
                              onClick={() => moveText('right')}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Down Arrow */}
                          <Button
                            onClick={() => moveText('down')}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          
                          {/* Reset Button */}
                          <Button
                            onClick={resetTextPosition}
                            variant="ghost"
                            size="sm"
                            className="text-gray-600 hover:text-gray-800"
                          >
                            Reset Position
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="showTipLabels"
                          checked={state.showTipLabels}
                          onCheckedChange={(checked) => updateState('showTipLabels', checked)}
                        />
                        <Label htmlFor="showTipLabels">Show Item Labels</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="autoNumbering"
                          checked={state.autoNumbering}
                          onCheckedChange={(checked) => updateState('autoNumbering', checked)}
                        />
                        <Label htmlFor="autoNumbering">Auto-Numbering</Label>
                      </div>
                    </div>

                    {state.autoNumbering && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="space-y-2">
                          <Label htmlFor="numberingFormat">Number Format</Label>
                          <Select value={state.numberingFormat} onValueChange={(value) => updateState('numberingFormat', value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {numberingFormatOptions.map(format => (
                                <SelectItem key={format.value} value={format.value}>
                                  {format.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="numberingPrefix">Prefix</Label>
                          <Input
                            id="numberingPrefix"
                            value={state.numberingPrefix}
                            onChange={(e) => updateState('numberingPrefix', e.target.value)}
                            placeholder=""
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="numberingSuffix">Suffix</Label>
                          <Input
                            id="numberingSuffix"
                            value={state.numberingSuffix}
                            onChange={(e) => updateState('numberingSuffix', e.target.value)}
                            placeholder=". "
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      {state.tips.map((tip, index) => (
                        <div key={tip.id} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">
                              Item {index + 1}
                              {state.showTipLabels && (
                                <span className="text-sm text-gray-600 ml-2">
                                  Preview: "{getFormattedLabel(tip, index)}"
                                </span>
                              )}
                            </h4>
                            {state.tips.length > 1 && (
                              <Button
                                onClick={() => removeTip(tip.id)}
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>Item Label</Label>
                              <Input
                                value={tip.label}
                                onChange={(e) => updateTip(tip.id, 'label', e.target.value)}
                                placeholder="e.g., Sleep Tip, Advice, etc."
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Formatting</Label>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => updateTip(tip.id, 'bold', !tip.bold)}
                                  size="sm"
                                  variant={tip.bold ? "default" : "outline"}
                                  className="px-3"
                                >
                                  <strong>B</strong>
                                </Button>
                                <Button
                                  onClick={() => updateTip(tip.id, 'italic', !tip.italic)}
                                  size="sm"
                                  variant={tip.italic ? "default" : "outline"}
                                  className="px-3"
                                >
                                  <em>I</em>
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Content</Label>
                            <Textarea
                              value={tip.content}
                              onChange={(e) => updateTip(tip.id, 'content', e.target.value)}
                              rows={3}
                              className="resize-none"
                              placeholder="Enter your content here..."
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Preview Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Preview
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={state.showBack ? "secondary" : "default"}>
                    {state.showBack ? "Back" : "Front"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {state.showBack 
                      ? (state.backPortrait ? "Portrait" : "Landscape")
                      : (state.frontPortrait ? "Portrait" : "Landscape")
                    }
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateState('showBack', !state.showBack)}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Flip
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-6 rounded-lg">
                  <div className={`w-full max-w-md mx-auto ${getCurrentAspectRatio()} bg-white rounded-lg shadow-lg overflow-hidden`}>
                    <svg
                      ref={svgRef}
                      viewBox={`0 0 ${getCurrentDimensions().W} ${getCurrentDimensions().H}`}
                      className="w-full h-full"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {/* SVG content will be rendered by the renderBusinessCard function */}
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={exportSVG} 
                  className="w-full" 
                  variant="outline"
                  disabled={!!isExporting}
                >
                  {isExporting === 'svg' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporting SVG...
                    </>
                  ) : (
                    'Export as SVG'
                  )}
                </Button>
                <Button 
                  onClick={() => handlePNGExport(1)} 
                  className="w-full" 
                  variant="outline"
                >
                  <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                  Export PNG (300 DPI) - Info
                </Button>
                <Button 
                  onClick={() => handlePNGExport(2)} 
                  className="w-full" 
                  variant="outline"
                >
                  <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                  Export PNG (600 DPI) - Info
                </Button>
              </CardContent>
            </Card>

            <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border">
              <p className="mb-2"><strong>Orientation:</strong> {state.showBack ? (state.backPortrait ? 'Back Portrait' : 'Back Landscape') : (state.frontPortrait ? 'Front Portrait' : 'Front Landscape')} - {getCurrentDimensions().W}×{getCurrentDimensions().H}px</p>
              <p className="mb-2"><strong>Logo Sync:</strong> {state.useSameLogo ? 'Using same logo on both sides' : 'Using different logos'}</p>
              <p className="mb-2"><strong>Front Spacing:</strong> {state.frontLogoTextSpacing}px logo-to-text spacing</p>
              <p className="mb-2"><strong>Item Spacing:</strong> {state.tipsSpacing}px between content items</p>
              <p className="mb-2"><strong>Smart Layout:</strong> {state.dynamicSizing ? 'Enabled' : 'Disabled'} - {state.dynamicSizing ? 'Text automatically resizes when overlapping with logos/QR codes' : 'Text uses original size and positioning'}</p>
              <p className="mb-2"><strong>Manual Positioning:</strong> Arrow controls work in all modes for precise text placement.</p>
              <p className="mb-2"><strong>Transparency:</strong> Adjust logo and QR code opacity for subtle layering effects.</p>
              <p className="text-amber-600"><strong>Note:</strong> PNG export requires external conversion. The SVG export works perfectly for high-quality printing.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}