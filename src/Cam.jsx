import React, { useRef, useState, useEffect } from "react";
import { 
  Camera, 
  CameraOff, 
  Mic, 
  MicOff, 
  Monitor, 
  MessageSquare, 
  PenTool,
  Phone,
  PhoneOff,
  Send,
  Users,
  Square,
  Circle,
  Triangle,
  Type,
  Eraser,
  Trash2,
  Palette,
  Minus,
  AlertTriangle
} from "lucide-react";

// CSS Styles at the top
const styles = `
  .video-call-container {
    min-height: 100vh;
    background: white;
    display: flex;
    flex-direction: column;
  }

  .header {
    background: white;
    border-bottom: 1px solid #e5e7eb;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .participants-count {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .participants-text {
    font-size: 14px;
    font-weight: 500;
    color: #374151;
  }

  .call-title {
    font-size: 14px;
    color: #6b7280;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .live-indicator {
    font-size: 14px;
    font-weight: 500;
    color: #16a34a;
  }

  .call-duration {
    font-size: 14px;
    color: #6b7280;
  }

  .main-content {
    flex: 1;
    display: flex;
  }

  .video-area {
    flex: 1;
    background: #f9fafb;
    position: relative;
  }

  .screen-share-layout {
    width: 100%;
    height: 100%;
    position: relative;
  }

  .screen-share-video {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #111827;
  }

  .screen-share-indicator {
    position: absolute;
    top: 16px;
    left: 16px;
    background: #16a34a;
    color: white;
    padding: 8px 12px;
    border-radius: 20px;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .screen-share-error {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: white;
    background: rgba(0, 0, 0, 0.8);
    padding: 24px;
    border-radius: 12px;
    max-width: 400px;
  }

  .error-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 16px;
    color: #ef4444;
  }

  .error-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .error-message {
    font-size: 14px;
    opacity: 0.9;
    line-height: 1.5;
  }

  .pip-video {
    position: absolute;
    bottom: 16px;
    right: 16px;
    width: 192px;
    height: 144px;
    background: #111827;
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid white;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }

  .pip-video video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .pip-label {
    position: absolute;
    bottom: 8px;
    left: 8px;
    color: white;
    font-size: 12px;
    background: rgba(0, 0, 0, 0.5);
    padding: 4px 8px;
    border-radius: 4px;
  }

  .side-by-side-layout {
    width: 100%;
    height: 100%;
    display: flex;
  }

  .participant-video {
    flex: 1;
    position: relative;
  }

  .participant-video:nth-child(2) {
    border-left: 1px solid #d1d5db;
  }

  .participant-video video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    background: #111827;
  }

  .camera-off-state {
    position: absolute;
    inset: 0;
    background: #111827;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    color: white;
  }

  .camera-off-icon {
    width: 64px;
    height: 64px;
    margin-bottom: 8px;
    opacity: 0.5;
  }

  .camera-off-text {
    font-size: 18px;
  }

  .waiting-state {
    width: 100%;
    height: 100%;
    background: #111827;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    color: white;
    text-align: center;
  }

  .waiting-icon {
    width: 64px;
    height: 64px;
    margin-bottom: 8px;
    opacity: 0.5;
  }

  .waiting-name {
    font-size: 18px;
    margin-bottom: 4px;
  }

  .waiting-text {
    font-size: 14px;
    opacity: 0.75;
  }

  .participant-label {
    position: absolute;
    bottom: 16px;
    left: 16px;
    color: white;
    font-size: 14px;
    background: rgba(0, 0, 0, 0.5);
    padding: 8px 12px;
    border-radius: 4px;
  }

  .muted-indicator {
    color: #ef4444;
  }

  .status-message {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 1000;
    max-width: 300px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }

  .status-success {
    background: #10b981;
    color: white;
  }

  .status-error {
    background: #ef4444;
    color: white;
  }

  .status-info {
    background: #3b82f6;
    color: white;
  }

  .whiteboard-overlay {
    position: absolute;
    inset: 0;
    background: white;
  }

  .whiteboard-container {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .whiteboard-toolbar {
    background: #f3f4f6;
    padding: 16px;
    border-bottom: 1px solid #e5e7eb;
  }

  .toolbar-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .whiteboard-title {
    font-size: 18px;
    font-weight: 600;
  }

  .tool-group {
    display: flex;
    gap: 8px;
  }

  .tool-btn {
    padding: 8px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    background: white;
    transition: all 0.2s;
  }

  .tool-btn:hover {
    background: #f9fafb;
  }

  .tool-btn.active {
    background: #3b82f6;
    color: white;
  }

  .color-group {
    display: flex;
    gap: 4px;
  }

  .color-btn {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid #d1d5db;
    cursor: pointer;
    transition: all 0.2s;
  }

  .color-btn.active {
    border-color: #111827;
  }

  .color-picker-container {
    display: flex;
    align-items: center;
    gap: 8px;
    background: white;
    padding: 8px;
    border-radius: 4px;
    border: 1px solid #d1d5db;
  }

  .color-input {
    width: 40px;
    height: 30px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .hex-input {
    width: 80px;
    padding: 4px 8px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 12px;
  }

  .size-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .size-label {
    font-size: 14px;
  }

  .size-slider {
    width: 80px;
  }

  .size-value {
    font-size: 14px;
    width: 32px;
  }

  .toolbar-right {
    display: flex;
    gap: 8px;
  }

  .toolbar-btn {
    padding: 8px 12px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }

  .btn-gray {
    background: #6b7280;
    color: white;
  }

  .btn-gray:hover {
    background: #4b5563;
  }

  .btn-red {
    background: #ef4444;
    color: white;
  }

  .btn-red:hover {
    background: #dc2626;
  }

  .canvas-container {
    flex: 1;
    padding: 16px;
  }

  .whiteboard-canvas {
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    cursor: crosshair;
    width: 100%;
    max-width: 100%;
    max-height: 100%;
  }

  .chat-panel {
    width: 320px;
    background: white;
    border-left: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
  }

  .chat-header {
    padding: 16px;
    border-bottom: 1px solid #e5e7eb;
  }

  .chat-title {
    font-size: 18px;
    font-weight: 600;
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .chat-input-area {
    padding: 16px;
    border-top: 1px solid #e5e7eb;
  }

  .chat-input-group {
    display: flex;
    gap: 8px;
  }

  .chat-input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    outline: none;
    transition: border-color 0.2s;
  }

  .chat-input:focus {
    border-color: #3b82f6;
  }

  .send-btn {
    padding: 8px 12px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .send-btn:hover {
    background: #2563eb;
  }

  .control-bar {
    background: #111827;
    padding: 16px 24px;
  }

  .controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }

  .control-btn {
    padding: 12px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .control-btn.camera-on {
    background: #4b5563;
    color: white;
  }

  .control-btn.camera-on:hover {
    background: #374151;
  }

  .control-btn.camera-off {
    background: #ef4444;
    color: white;
  }

  .control-btn.camera-off:hover {
    background: #dc2626;
  }

  .control-btn.mic-on {
    background: #4b5563;
    color: white;
  }

  .control-btn.mic-on:hover {
    background: #374151;
  }

  .control-btn.mic-off {
    background: #ef4444;
    color: white;
  }

  .control-btn.mic-off:hover {
    background: #dc2626;
  }

  .control-btn.screen-active {
    background: #3b82f6;
    color: white;
  }

  .control-btn.screen-active:hover {
    background: #2563eb;
  }

  .control-btn.screen-inactive {
    background: #4b5563;
    color: white;
  }

  .control-btn.screen-inactive:hover {
    background: #374151;
  }

  .control-btn.panel-active {
    background: #3b82f6;
    color: white;
  }

  .control-btn.panel-active:hover {
    background: #2563eb;
  }

  .control-btn.panel-inactive {
    background: #4b5563;
    color: white;
  }

  .control-btn.panel-inactive:hover {
    background: #374151;
  }

  .end-call-btn {
    background: #ef4444;
    color: white;
    margin-left: 32px;
  }

  .end-call-btn:hover {
    background: #dc2626;
  }

  .call-ended {
    min-height: 100vh;
    background: #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .call-ended-content {
    text-align: center;
  }

  .call-ended-title {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 16px;
  }

  .restart-btn {
    background: #3b82f6;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .restart-btn:hover {
    background: #2563eb;
  }
`;

const VideoCallComponent = () => {
  const videoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const chatMessagesRef = useRef(null);
  
  // Call state
  const [isInCall, setIsInCall] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [currentStream, setCurrentStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [screenShareError, setScreenShareError] = useState(null);
  
  // Timer state
  const [callStartTime] = useState(Date.now());
  const [callDuration, setCallDuration] = useState("0:00:00");
  
  // UI state
  const [activePanel, setActivePanel] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);
  
  // Whiteboard state
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState({ x: 0, y: 0 });
  const [whiteboardTool, setWhiteboardTool] = useState('pen');
  const [whiteboardColor, setWhiteboardColor] = useState('#000000');
  const [customColor, setCustomColor] = useState('#000000');
  const [hexColor, setHexColor] = useState('000000');
  const [whiteboardSize, setWhiteboardSize] = useState(2);
  const [whiteboardHistory, setWhiteboardHistory] = useState([]);

  const presetColors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB'];

  // Show status message
  const showStatus = (message, type = 'info', duration = 3000) => {
    setStatusMessage({ message, type });
    setTimeout(() => setStatusMessage(null), duration);
  };

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Date.now() - callStartTime;
      const hours = Math.floor(elapsed / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      setCallDuration(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [callStartTime]);

  // Initialize canvas for whiteboard
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      
      // Set canvas size to match its display size
      canvas.width = 1200;
      canvas.height = 600;
      
      // Configure drawing settings
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = whiteboardSize;
      ctx.strokeStyle = whiteboardColor;
      ctx.fillStyle = whiteboardColor;
      ctx.globalCompositeOperation = 'source-over';
      
      // Clear canvas with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = whiteboardColor;
      
      // Save initial state
      setWhiteboardHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    }
  }, []);

  // Update canvas settings when tool/color/size changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.lineWidth = whiteboardSize;
      ctx.strokeStyle = whiteboardColor;
      ctx.fillStyle = whiteboardColor;
      ctx.globalCompositeOperation = whiteboardTool === 'eraser' ? 'destination-out' : 'source-over';
    }
  }, [whiteboardTool, whiteboardColor, whiteboardSize]);

  // Auto-scroll chat messages
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Update hex color when custom color changes
  useEffect(() => {
    setHexColor(customColor.replace('#', ''));
  }, [customColor]);

  // Helper function to get accurate canvas coordinates
  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate the scaling factors
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Get mouse position relative to canvas and scale it
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    return { x, y };
  };

  const toggleCamera = async () => {
    if (!isCameraOn) {
      try {
        showStatus("Requesting camera access...", "info");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCurrentStream(stream);
        setIsCameraOn(true);
        setIsMicOn(true);
        showStatus("Camera and microphone enabled", "success");
      } catch (error) {
        console.error('Error accessing camera:', error);
        let errorMessage = "Unable to access camera.";
        if (error.name === 'NotAllowedError') {
          errorMessage = "Camera access denied. Please allow camera permissions.";
        } else if (error.name === 'NotFoundError') {
          errorMessage = "No camera found on this device.";
        } else if (error.name === 'NotSupportedError') {
          errorMessage = "Camera not supported in this browser.";
        }
        showStatus(errorMessage, "error", 5000);
      }
    } else {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        setCurrentStream(null);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsCameraOn(false);
      setIsMicOn(false);
      showStatus("Camera and microphone disabled", "info");
    }
  };

  const toggleMic = async () => {
    if (currentStream) {
      const audioTrack = currentStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicOn;
        setIsMicOn(!isMicOn);
        showStatus(isMicOn ? "Microphone muted" : "Microphone unmuted", "info");
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        // Clear any previous error
        setScreenShareError(null);
        showStatus("Starting screen share...", "info");
        
        // Check if getDisplayMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          throw new Error('Screen sharing not supported in this browser');
        }

        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
          },
          audio: true
        });
        
        console.log('Screen share stream obtained:', stream);
        
        // Set the screen share stream to the main video area
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          console.log('Stream assigned to video element');
        }
        
        setScreenStream(stream);
        setIsScreenSharing(true);
        showStatus("Screen sharing started successfully", "success");
        
        // Listen for when user stops sharing (via browser controls)
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            console.log('Screen share ended by user');
            setIsScreenSharing(false);
            setScreenStream(null);
            setScreenShareError(null);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = null;
            }
            showStatus("Screen sharing stopped", "info");
          };
        }
        
        // Also listen for audio track ending
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.onended = () => {
            console.log('Screen share audio ended');
          };
        }

        // Monitor stream status
        setTimeout(() => {
          if (stream.active && stream.getVideoTracks()[0].readyState === 'live') {
            console.log('Screen share is active and streaming');
          } else {
            console.warn('Screen share may not be working properly');
            setScreenShareError({
              title: "Screen Share Issue",
              message: "Screen sharing started but may not be displaying correctly. This could be due to browser limitations."
            });
          }
        }, 1000);
        
      } catch (error) {
        console.error('Error sharing screen:', error);
        let errorTitle = "Screen Share Failed";
        let errorMessage = "Unable to start screen sharing.";
        
        if (error.name === 'NotAllowedError') {
          errorMessage = "Screen sharing permission denied. Please allow screen sharing and try again.";
        } else if (error.name === 'NotSupportedError') {
          errorMessage = "Screen sharing is not supported in this browser. Try using Chrome, Firefox, or Edge.";
        } else if (error.name === 'AbortError') {
          errorMessage = "Screen sharing was cancelled.";
          errorTitle = "Screen Share Cancelled";
        } else if (error.message.includes('not supported')) {
          errorMessage = "Screen sharing is not available in this environment. This may be due to security restrictions.";
        }
        
        setScreenShareError({ title: errorTitle, message: errorMessage });
        showStatus(errorMessage, "error", 5000);
        setIsScreenSharing(false);
      }
    } else {
      // Stop screen sharing
      console.log('Stopping screen share...');
      if (screenStream) {
        screenStream.getTracks().forEach(track => {
          track.stop();
          console.log('Track stopped:', track.kind);
        });
        setScreenStream(null);
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      setIsScreenSharing(false);
      setScreenShareError(null);
      showStatus("Screen sharing stopped", "info");
    }
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      const newMsg = {
        id: chatMessages.length + 1,
        sender: 'Mr Khubeka',
        message: newMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isTeacher: false
      };
      setChatMessages([...chatMessages, newMsg]);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const handleColorChange = (color) => {
    setWhiteboardColor(color);
    setCustomColor(color);
  };

  const handleHexChange = (e) => {
    const hex = e.target.value.replace('#', '');
    setHexColor(hex);
    if (/^[0-9A-F]{6}$/i.test(hex)) {
      const color = `#${hex}`;
      setWhiteboardColor(color);
      setCustomColor(color);
    }
  };

  // Whiteboard functions
  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (canvas && whiteboardHistory.length < 50) {
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setWhiteboardHistory([...whiteboardHistory, imageData]);
    }
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const coords = getCanvasCoordinates(e);
    const ctx = canvas.getContext('2d');
    
    setIsDrawing(true);
    setLastPoint(coords);
    
    // Save canvas state before starting to draw (for undo functionality)
    saveCanvasState();
    
    if (whiteboardTool === 'pen' || whiteboardTool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      // Draw a small dot for single clicks
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const coords = getCanvasCoordinates(e);
    
    if (whiteboardTool === 'pen' || whiteboardTool === 'eraser') {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
    
    // For shapes, we'll draw a preview (but we'll implement proper preview later)
    setLastPoint({ ...lastPoint }); // Keep original start point for shapes
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const coords = getCanvasCoordinates(e);
    
    // Draw shapes when mouse is released
    if (whiteboardTool === 'rectangle') {
      const width = coords.x - lastPoint.x;
      const height = coords.y - lastPoint.y;
      ctx.beginPath();
      ctx.rect(lastPoint.x, lastPoint.y, width, height);
      ctx.stroke();
    } else if (whiteboardTool === 'circle') {
      const radius = Math.sqrt(Math.pow(coords.x - lastPoint.x, 2) + Math.pow(coords.y - lastPoint.y, 2));
      ctx.beginPath();
      ctx.arc(lastPoint.x, lastPoint.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (whiteboardTool === 'line') {
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (whiteboardTool === 'triangle') {
      const width = coords.x - lastPoint.x;
      const height = coords.y - lastPoint.y;
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(lastPoint.x + width / 2, lastPoint.y - height);
      ctx.lineTo(coords.x, coords.y);
      ctx.closePath();
      ctx.stroke();
    }
    
    setIsDrawing(false);
  };

  // Touch event handlers for mobile support
  const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    startDrawing(mouseEvent);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    draw(mouseEvent);
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    const mouseEvent = new MouseEvent('mouseup', {});
    stopDrawing(mouseEvent);
  };

  const clearWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Clear the entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Fill with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Reset drawing style
    ctx.fillStyle = whiteboardColor;
    ctx.strokeStyle = whiteboardColor;
    
    saveCanvasState();
  };

  const undoWhiteboard = () => {
    if (whiteboardHistory.length > 1) {
      const newHistory = whiteboardHistory.slice(0, -1);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.putImageData(newHistory[newHistory.length - 1], 0, 0);
      setWhiteboardHistory(newHistory);
    }
  };

  const endCall = () => {
    setIsInCall(false);
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }
  };

  if (!isInCall) {
    return (
      <>
        <style>{styles}</style>
        <div className="call-ended">
          <div className="call-ended-content">
            <h2 className="call-ended-title">Call Ended</h2>
            <button 
              onClick={() => setIsInCall(true)}
              className="restart-btn"
            >
              Start New Call
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      {/* Status Message */}
      {statusMessage && (
        <div className={`status-message status-${statusMessage.type}`}>
          {statusMessage.message}
        </div>
      )}
      
      <div className="video-call-container">
        {/* Header */}
        <div className="header">
          <div className="header-left">
            <div className="participants-count">
              <Users className="w-5 h-5 text-gray-600" />
              <span className="participants-text">2 Participants</span>
            </div>
            <div className="call-title">Advanced Video Call</div>
          </div>
          
          <div className="header-right">
            <span className="live-indicator">● LIVE</span>
            <span className="call-duration">{callDuration}</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Video Area */}
          <div className="video-area">
            {isScreenSharing ? (
              // Screen sharing layout
              <div className="screen-share-layout">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="screen-share-video"
                />
                
                <div className="screen-share-indicator">
                  <Monitor className="w-4 h-4" />
                  <span>Mr Khubeka is sharing screen</span>
                </div>

                {/* Screen Share Error Display */}
                {screenShareError && (
                  <div className="screen-share-error">
                    <AlertTriangle className="error-icon" />
                    <div className="error-title">{screenShareError.title}</div>
                    <div className="error-message">{screenShareError.message}</div>
                  </div>
                )}

                {/* Local Video (PiP during screen share) */}
                <div className="pip-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                  />
                  <div className="pip-label">
                    Mr Khubeka
                  </div>
                </div>
              </div>
            ) : (
              // Side by side participant layout
              <div className="side-by-side-layout">
                {/* Local Video */}
                <div className="participant-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                  />
                  <div className="participant-label">
                    Mr Khubeka {!isMicOn && <span className="muted-indicator">(Muted)</span>}
                  </div>
                  {!isCameraOn && (
                    <div className="camera-off-state">
                      <CameraOff className="camera-off-icon" />
                      <p className="camera-off-text">Camera Off</p>
                    </div>
                  )}
                </div>

                {/* Remote Video */}
                <div className="participant-video">
                  <div className="waiting-state">
                    <Users className="waiting-icon" />
                    <p className="waiting-name">Ikaneng Mmako</p>
                    <p className="waiting-text">Waiting to connect...</p>
                  </div>
                  <div className="participant-label">
                    Ikaneng Mmako
                  </div>
                </div>
              </div>
            )}

            {/* Whiteboard Overlay */}
            {activePanel === 'whiteboard' && (
              <div className="whiteboard-overlay">
                <div className="whiteboard-container">
                  {/* Whiteboard Toolbar */}
                  <div className="whiteboard-toolbar">
                    <div className="toolbar-content">
                      <div className="toolbar-left">
                        <h3 className="whiteboard-title">Whiteboard</h3>
                        
                        {/* Tools */}
                        <div className="tool-group">
                          <button
                            onClick={() => setWhiteboardTool('pen')}
                            className={`tool-btn ${whiteboardTool === 'pen' ? 'active' : ''}`}
                          >
                            <PenTool className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setWhiteboardTool('eraser')}
                            className={`tool-btn ${whiteboardTool === 'eraser' ? 'active' : ''}`}
                          >
                            <Eraser className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setWhiteboardTool('line')}
                            className={`tool-btn ${whiteboardTool === 'line' ? 'active' : ''}`}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setWhiteboardTool('rectangle')}
                            className={`tool-btn ${whiteboardTool === 'rectangle' ? 'active' : ''}`}
                          >
                            <Square className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setWhiteboardTool('circle')}
                            className={`tool-btn ${whiteboardTool === 'circle' ? 'active' : ''}`}
                          >
                            <Circle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setWhiteboardTool('triangle')}
                            className={`tool-btn ${whiteboardTool === 'triangle' ? 'active' : ''}`}
                          >
                            <Triangle className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Preset Colors */}
                        <div className="color-group">
                          {presetColors.map(color => (
                            <button
                              key={color}
                              onClick={() => handleColorChange(color)}
                              className={`color-btn ${whiteboardColor === color ? 'active' : ''}`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>

                        {/* Custom Color Picker */}
                        <div className="color-picker-container">
                          <input
                            type="color"
                            value={customColor}
                            onChange={(e) => handleColorChange(e.target.value)}
                            className="color-input"
                          />
                          <span style={{ fontSize: '12px' }}>#</span>
                          <input
                            type="text"
                            value={hexColor}
                            onChange={handleHexChange}
                            className="hex-input"
                            placeholder="000000"
                            maxLength="6"
                          />
                        </div>

                        {/* Size */}
                        <div className="size-controls">
                          <span className="size-label">Size:</span>
                          <input
                            type="range"
                            min="1"
                            max="20"
                            value={whiteboardSize}
                            onChange={(e) => setWhiteboardSize(parseInt(e.target.value))}
                            className="size-slider"
                          />
                          <span className="size-value">{whiteboardSize}px</span>
                        </div>
                      </div>
                      
                      <div className="toolbar-right">
                        <button
                          onClick={undoWhiteboard}
                          className="toolbar-btn btn-gray"
                        >
                          Undo
                        </button>
                        <button
                          onClick={clearWhiteboard}
                          className="toolbar-btn btn-red"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setActivePanel(null)}
                          className="toolbar-btn btn-gray"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Canvas */}
                  <div className="canvas-container">
                    <canvas
                      ref={canvasRef}
                      width={1200}
                      height={600}
                      className="whiteboard-canvas"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      style={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: '500px',
                        touchAction: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Side Panel - Chat */}
          {activePanel === 'chat' && (
            <div className="chat-panel">
              <div className="chat-header">
                <h3 className="chat-title">Chat</h3>
              </div>
              
              <div className="chat-messages" ref={chatMessagesRef}>
                {chatMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
                    <MessageSquare className="w-12 h-12" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                    <p>No messages yet</p>
                    <p style={{ fontSize: '14px', marginTop: '8px' }}>Start the conversation!</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {chatMessages.map((msg) => (
                      <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ 
                            fontSize: '14px', 
                            fontWeight: '500',
                            color: msg.isTeacher ? '#2563eb' : '#374151'
                          }}>
                            {msg.sender}
                          </span>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>{msg.time}</span>
                        </div>
                        <p style={{ fontSize: '14px', color: '#111827' }}>{msg.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="chat-input-area">
                <div className="chat-input-group">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="chat-input"
                  />
                  <button
                    onClick={sendMessage}
                    className="send-btn"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Control Bar */}
        <div className="control-bar">
          <div className="controls">
            {/* Camera Toggle */}
            <button
              onClick={toggleCamera}
              className={`control-btn ${isCameraOn ? 'camera-on' : 'camera-off'}`}
            >
              {isCameraOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
            </button>

            {/* Microphone Toggle */}
            <button
              onClick={toggleMic}
              className={`control-btn ${isMicOn ? 'mic-on' : 'mic-off'}`}
            >
              {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            {/* Screen Share */}
            <button
              onClick={toggleScreenShare}
              className={`control-btn ${isScreenSharing ? 'screen-active' : 'screen-inactive'}`}
            >
              <Monitor className="w-5 h-5" />
            </button>

            {/* Chat Toggle */}
            <button
              onClick={() => setActivePanel(activePanel === 'chat' ? null : 'chat')}
              className={`control-btn ${activePanel === 'chat' ? 'panel-active' : 'panel-inactive'}`}
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            {/* Whiteboard Toggle */}
            <button
              onClick={() => setActivePanel(activePanel === 'whiteboard' ? null : 'whiteboard')}
              className={`control-btn ${activePanel === 'whiteboard' ? 'panel-active' : 'panel-inactive'}`}
            >
              <PenTool className="w-5 h-5" />
            </button>

            {/* End Call */}
            <button
              onClick={endCall}
              className="control-btn end-call-btn"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default VideoCallComponent;