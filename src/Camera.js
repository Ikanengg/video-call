import React, { useRef, useState, useEffect } from "react";
import "./Camera.css";
import { supabase } from "./supabaseClient";

const CameraComponent = () => {
  const videoRef = useRef(null);           // Local video element
  const remoteVideoRef = useRef(null);     // Remote video element
  const pc = useRef(null);                 // RTCPeerConnection

  const pendingLocalCandidates = useRef([]); // Buffer ICE until callId exists
  const addedRemoteCandidates = useRef(new Set()); // Deduplicate remote ICE

  const roleRef = useRef(null); // "caller" or "callee"

  const [callId, setCallId] = useState(null);
  const [joinCallId, setJoinCallId] = useState("");
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [stream, setStream] = useState(null);
  const [connectionState, setConnectionState] = useState('new');

  const configuration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject"
      }
    ]
  };

  // ---------- RTCPeerConnection ----------
  useEffect(() => {
    console.log("[PC] Creating RTCPeerConnection");
    pc.current = new RTCPeerConnection(configuration);

    pc.current.ontrack = (event) => {
      console.log("[PC] Remote track received:", event.track.kind, event.streams);
      if (remoteVideoRef.current && event.streams && event.streams[0]) {
        console.log("[PC] Setting remote video srcObject");
        remoteVideoRef.current.srcObject = event.streams[0];
        
        // Force play the remote video
        remoteVideoRef.current.play().catch(e => {
          console.error("[PC] Error playing remote video:", e);
        });
      }
    };

    pc.current.onicecandidate = async (event) => {
      if (!event.candidate) {
        console.log("[ICE] Gathering complete (null candidate)");
        return;
      }

      const cand = event.candidate.toJSON();
      console.log("[ICE] Generated candidate:", cand);

      if (!callId) {
        console.log("[ICE] No callId yet — buffering local candidate");
        pendingLocalCandidates.current.push(cand);
        return;
      }

      await addLocalCandidate(cand);
    };

    // Add connection state monitoring
    pc.current.onconnectionstatechange = () => {
      const state = pc.current.connectionState;
      console.log("[PC] Connection state:", state);
      setConnectionState(state);
    };

    pc.current.oniceconnectionstatechange = () => {
      console.log("[PC] ICE connection state:", pc.current.iceConnectionState);
    };

    return () => {
      console.log("[PC] Closing RTCPeerConnection");
      if (pc.current) {
        pc.current.close();
      }
    };
  }, []);

  // Helper function to add local candidates
  const addLocalCandidate = async (candidate) => {
    try {
      const iceKey = roleRef.current === "caller" ? "caller_ice" : "callee_ice";
      const { data } = await supabase.from("calls").select(iceKey).eq("id", callId).single();
      const current = Array.isArray(data?.[iceKey]) ? data[iceKey] : [];
      
      await supabase.from("calls").update({ 
        [iceKey]: [...current, candidate] 
      }).eq("id", callId);
      
      console.log(`[ICE] Stored ${iceKey} candidate. Total now: ${current.length + 1}`);
    } catch (error) {
      console.error("[ICE] Error storing candidate:", error);
    }
  };

  // ---------- Supabase realtime subscription ----------
  useEffect(() => {
    if (!callId) return;

    console.log("[RT] Subscribing to updates for call:", callId);
    const channel = supabase
      .channel(`call-${callId}`) // Use unique channel name
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls", filter: `id=eq.${callId}` },
        async (payload) => {
          console.log("[RT] Received update:", payload);
          const callData = payload.new;

          // Handle answer for caller
          if (roleRef.current === "caller" && callData.answer && !pc.current.remoteDescription) {
            console.log("[RT] Setting remote description (answer)");
            try {
              await pc.current.setRemoteDescription({ 
                type: "answer", 
                sdp: callData.answer 
              });
              console.log("[RT] Remote description set successfully");
            } catch (error) {
              console.error("[RT] Error setting remote description:", error);
            }
          }

          // Handle offer for callee (in case they join after offer is created)
          if (roleRef.current === "callee" && callData.offer && !pc.current.remoteDescription) {
            console.log("[RT] Setting remote description (offer)");
            try {
              await pc.current.setRemoteDescription({ 
                type: "offer", 
                sdp: callData.offer 
              });
            } catch (error) {
              console.error("[RT] Error setting remote description:", error);
            }
          }

          // Add remote ICE candidates
          const remoteIceKey = roleRef.current === "caller" ? "callee_ice" : "caller_ice";
          const list = Array.isArray(callData[remoteIceKey]) ? callData[remoteIceKey] : [];

          console.log(`[RT] Processing ${list.length} remote ICE candidates`);
          
          for (const cand of list) {
            const key = JSON.stringify(cand);
            if (addedRemoteCandidates.current.has(key)) continue;
            
            try {
              // Wait for remote description before adding candidates
              if (pc.current.remoteDescription) {
                await pc.current.addIceCandidate(cand);
                addedRemoteCandidates.current.add(key);
                console.log("[RT] Added remote ICE candidate");
              } else {
                console.log("[RT] Waiting for remote description before adding ICE candidate");
                // You might want to buffer these too
              }
            } catch (e) {
              console.error("[RT] Error adding remote ICE candidate:", e);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("[RT] Channel status:", status);
      });

    return () => {
      console.log("[RT] Unsubscribing from channel");
      supabase.removeChannel(channel);
    };
  }, [callId]);

  // ---------- Camera ----------
  const startCamera = async () => {
    try {
      console.log("[CAM] Requesting media");
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 }, 
        audio: true 
      });
      
      // Add tracks to peer connection
      mediaStream.getTracks().forEach((track) => {
        console.log("[CAM] Adding track:", track.kind);
        pc.current.addTrack(track, mediaStream);
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setStream(mediaStream);
      setIsCameraOn(true);
      console.log("[CAM] Local preview set");
    } catch (err) {
      console.error("[CAM] getUserMedia error:", err);
      alert("Unable to access camera/mic: " + err.message);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
      setIsCameraOn(false);
    }
  };

  // ---------- Caller ----------
  const createCall = async () => {
    if (!isCameraOn) return alert("Start your camera first.");
    roleRef.current = "caller";

    try {
      console.log("[CALLER] Creating offer");
      const offer = await pc.current.createOffer({ 
        offerToReceiveVideo: true, 
        offerToReceiveAudio: true 
      });
      
      await pc.current.setLocalDescription(offer);
      console.log("[CALLER] Local description set");

      const { data, error } = await supabase
        .from("calls")
        .insert([{ 
          offer: offer.sdp, 
          answer: null, 
          caller_ice: [], 
          callee_ice: [] 
        }])
        .select("*")
        .single();

      if (error) throw error;

      setCallId(data.id);
      console.log("[CALLER] Call created with ID:", data.id);

      // Flush any buffered candidates
      if (pendingLocalCandidates.current.length > 0) {
        console.log("[CALLER] Flushing", pendingLocalCandidates.current.length, "buffered candidates");
        for (const cand of pendingLocalCandidates.current) {
          await addLocalCandidate(cand);
        }
        pendingLocalCandidates.current = [];
      }
    } catch (error) {
      console.error("[CALLER] Error creating call:", error);
      alert("Failed to create call: " + error.message);
    }
  };

  // ---------- Callee ----------
  const joinCall = async () => {
    if (!isCameraOn) return alert("Start your camera first.");
    if (!joinCallId.trim()) return alert("Enter call ID");
    
    roleRef.current = "callee";

    try {
      console.log("[CALLEE] Joining call:", joinCallId);
      const { data: callData, error } = await supabase
        .from("calls")
        .select("*")
        .eq("id", joinCallId.trim())
        .single();

      if (error || !callData) {
        throw new Error("Call not found");
      }

      if (!callData.offer) {
        throw new Error("No offer found in call");
      }

      setCallId(joinCallId.trim());

      // Set remote offer
      console.log("[CALLEE] Setting remote description (offer)");
      await pc.current.setRemoteDescription({ 
        type: "offer", 
        sdp: callData.offer 
      });

      // Create & set answer
      console.log("[CALLEE] Creating answer");
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);

      // Update call with answer
      await supabase
        .from("calls")
        .update({ answer: answer.sdp })
        .eq("id", joinCallId.trim());

      console.log("[CALLEE] Answer sent");

      // Flush buffered candidates
      if (pendingLocalCandidates.current.length > 0) {
        console.log("[CALLEE] Flushing", pendingLocalCandidates.current.length, "buffered candidates");
        for (const cand of pendingLocalCandidates.current) {
          await addLocalCandidate(cand);
        }
        pendingLocalCandidates.current = [];
      }
    } catch (error) {
      console.error("[CALLEE] Error joining call:", error);
      alert("Failed to join call: " + error.message);
      setCallId(null);
      roleRef.current = null;
    }
  };

  return (
    <div className="camera-container">
      <h2>Video Call Camera Preview</h2>
      
      <div className="video-container">
        <div className="video-wrapper">
          <h3>Local Video</h3>
          <video ref={videoRef} autoPlay playsInline muted className="camera-preview" />
        </div>
        
        <div className="video-wrapper">
          <h3>Remote Video</h3>
          <video ref={remoteVideoRef} autoPlay playsInline className="camera-preview" />
        </div>
      </div>

      <div className="status">
        <p><strong>Connection State:</strong> {connectionState}</p>
        {callId && <p><strong>Role:</strong> {roleRef.current}</p>}
      </div>

      <div className="camera-controls">
        {!isCameraOn ? (
          <button onClick={startCamera}>Turn Camera On</button>
        ) : (
          <>
            <button onClick={stopCamera}>Turn Camera Off</button>
            {!callId && <button onClick={createCall}>Create Call</button>}
          </>
        )}
      </div>

      {!callId && (
        <div className="join-call">
          <input 
            type="text" 
            placeholder="Enter call ID" 
            value={joinCallId} 
            onChange={(e) => setJoinCallId(e.target.value)} 
          />
          <button onClick={joinCall}>Join Call</button>
        </div>
      )}

      {callId && (
        <div className="call-id-display">
          <p><strong>Call ID:</strong> {callId}</p>
          <button onClick={() => navigator.clipboard.writeText(callId)}>Copy Call ID</button>
        </div>
      )}
    </div>
  );
};

export default CameraComponent;